import { db } from "./db";
import { evidenceState } from "./domain.mjs";
import { createSnapshotsIdempotently } from "./snapshot-domain.mjs";

export async function createSessionSnapshots(sessionId: string) {
  const session = await db.classSession.findUnique({ where: { id: sessionId } });
  if (!session?.endedAt) throw new Error("A closed session with a safe time window is required");

  const [concepts, signals] = await Promise.all([
    db.concept.findMany({ where: { courseId: session.courseId }, select: { id: true } }),
    db.conceptSignal.findMany({
      where: {
        concept: { courseId: session.courseId },
        createdAt: { gte: session.startedAt, lte: session.endedAt }
      },
      select: { conceptId: true, participantKey: true }
    })
  ]);
  const byConcept = new Map<string, { participants: Set<string>; signalCount: number }>();
  for (const signal of signals) {
    const aggregate = byConcept.get(signal.conceptId) ?? { participants: new Set<string>(), signalCount: 0 };
    aggregate.participants.add(signal.participantKey);
    aggregate.signalCount += 1;
    byConcept.set(signal.conceptId, aggregate);
  }
  const threshold = Number(process.env.INSIGHT_MIN_PARTICIPANTS || 3);
  const rows = concepts.map(({ id: conceptId }) => {
    const aggregate = byConcept.get(conceptId);
    const participantCount = aggregate?.participants.size ?? 0;
    return { courseId: session.courseId, conceptId, sessionId, participantCount, signalCount: aggregate?.signalCount ?? 0, evidenceState: evidenceState(participantCount, threshold), capturedAt: session.endedAt! };
  });
  return createSnapshotsIdempotently(rows, (data: typeof rows) => db.conceptSnapshot.createMany({ data, skipDuplicates: true }));
}

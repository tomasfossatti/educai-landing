export const TREND_THRESHOLDS = Object.freeze({
  minParticipantsForNew: Number(process.env.TREND_NEW_MIN_PARTICIPANTS || 3),
  minParticipantChange: Number(process.env.TREND_MIN_PARTICIPANT_CHANGE || 2),
  minRelativeChange: Number(process.env.TREND_MIN_RELATIVE_CHANGE || 0.25)
});

/** NO_DATA is deliberately returned as no classification: absence is not change. */
export function classifyTrend(previous, current, thresholds = TREND_THRESHOLDS) {
  if (!current || current.evidenceState === "NO_DATA") return null;
  if (!previous || previous.evidenceState === "NO_DATA") {
    return current.participantCount >= thresholds.minParticipantsForNew ? "NEW" : "STABLE";
  }
  const delta = current.participantCount - previous.participantCount;
  const relative = previous.participantCount > 0 ? Math.abs(delta) / previous.participantCount : 0;
  const relevant = Math.abs(delta) >= thresholds.minParticipantChange && relative >= thresholds.minRelativeChange;
  if (!relevant) return "STABLE";
  return delta > 0 ? "RISING" : "FALLING";
}

export function compareConsecutiveSnapshots(snapshots, thresholds = TREND_THRESHOLDS) {
  const ordered = [...snapshots].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  return { current: ordered[0] ?? null, previous: ordered[1] ?? null, trend: classifyTrend(ordered[1], ordered[0], thresholds) };
}

export function selectInterventionWindows({ intervention, sessions }) {
  const post = sessions.find((session) => session.id === intervention.sessionId && session.endedAt) ?? null;
  if (!post) return { before: null, after: null };
  const before = sessions
    .filter((session) => session.id !== post.id && session.endedAt && new Date(session.endedAt) <= new Date(post.startedAt))
    .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())[0] ?? null;
  return {
    before: before ? { sessionId: before.id, from: before.startedAt, to: before.endedAt } : null,
    after: { sessionId: post.id, from: post.startedAt, to: post.endedAt }
  };
}

export async function createSnapshotsIdempotently(rows, insert) {
  if (!rows.length) return { count: 0 };
  return insert(rows);
}

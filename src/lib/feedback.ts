import "server-only";
import { db } from "./db";

export async function refreshFeedbackAggregate(sessionId: string, conceptId: string) {
  const where = { sessionId, conceptId };
  const feedback = await db.studentFeedback.findMany({ where, select: { clarity: true, stillDoubt: true, courseId: true } });
  if (!feedback.length) return null;
  const responseCount = feedback.length;
  const averageClarity = feedback.reduce((sum, f) => sum + f.clarity, 0) / responseCount;
  const stillDoubtCount = feedback.filter((f) => f.stillDoubt).length;
  const stillDoubtRate = stillDoubtCount / responseCount;
  return db.feedbackAggregate.upsert({
    where: { sessionId_conceptId: { sessionId, conceptId } },
    update: { responseCount, averageClarity, stillDoubtCount, stillDoubtRate, generatedAt: new Date() },
    create: { courseId: feedback[0].courseId, sessionId, conceptId, responseCount, averageClarity, stillDoubtCount, stillDoubtRate }
  });
}

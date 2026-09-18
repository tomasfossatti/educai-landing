import "server-only";
import { db } from "./db";
import { lexicalScore } from "./text";

export async function retrieveContext(courseId: string, query: string, limit = 5) {
  const chunks = await db.contentChunk.findMany({
    where: { courseId, material: { state: "ACTIVE" } },
    select: { id: true, text: true, material: { select: { title: true } } },
    take: 400
  });
  return chunks
    .map((chunk) => ({ ...chunk, score: lexicalScore(query, chunk.text) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

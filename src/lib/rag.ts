import "server-only";
import { db } from "./db";
import { lexicalCandidates } from "./retrieval-domain.mjs";

export async function retrieveContext(courseId: string, query: string, limit = 5) {
  const chunks = await db.contentChunk.findMany({
    where: { courseId, material: { state: "ACTIVE" } },
    select: { id: true, text: true, material: { select: { title: true } } },
    take: 400
  });
  return lexicalCandidates(chunks.map((chunk) => ({ ...chunk, courseId, material: { ...chunk.material, state: "ACTIVE" } })), courseId, query, limit) as Array<{
    id: string;
    text: string;
    material: { title: string };
    score: number;
    retrievalMethod: "LEXICAL";
  }>;
}

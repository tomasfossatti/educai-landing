import "server-only";
import { db } from "./db";
import { lexicalScore } from "./text";
import { asVectorLiteral, EMBEDDING_MODEL, generateEmbeddings } from "./embeddings";
import { rankHybridCandidates } from "./retrieval-domain.mjs";

type Candidate = { id: string; text: string; position: number; material: { title: string } };

async function semanticCandidates(courseId: string, query: string, limit: number): Promise<Candidate[]> {
  const vectors = await generateEmbeddings([query]);
  if (!vectors) return [];
  return db.$queryRawUnsafe<Candidate[]>(`
    SELECT c."id", c."text", c."position", json_build_object('title', m."title") AS "material"
    FROM "ContentChunk" c
    JOIN "LearningMaterial" m ON m."id" = c."materialId"
    WHERE c."courseId" = $1
      AND m."state" = 'ACTIVE'
      AND c."embedding" IS NOT NULL
      AND c."embeddingModel" = $2
    ORDER BY c."embedding" <=> $3::vector
    LIMIT $4
  `, courseId, EMBEDDING_MODEL, asVectorLiteral(vectors[0]), limit);
}

export async function retrieveContext(courseId: string, query: string, limit = 5) {
  const chunks = await db.contentChunk.findMany({
    where: { courseId, material: { state: "ACTIVE" } },
    select: { id: true, text: true, position: true, material: { select: { title: true } } },
    take: 400
  });
  const lexical = chunks
    .map((chunk) => ({ ...chunk, score: lexicalScore(query, chunk.text) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(limit * 4, 20));
  let semantic: Candidate[] = [];
  try {
    semantic = await semanticCandidates(courseId, query, Math.max(limit * 4, 20));
  } catch (error) {
    console.error("semantic_retrieval_failed", { courseId, model: EMBEDDING_MODEL, error: error instanceof Error ? error.message : "unknown" });
  }
  return rankHybridCandidates(lexical, semantic, limit);
}

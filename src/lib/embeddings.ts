import "server-only";
import { db } from "./db";

export const EMBEDDING_DIMENSIONS = 1536;
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const MAX_ATTEMPTS = 3;

export function embeddingsConfigured() {
  return Boolean(process.env.EMBEDDING_API_KEY);
}

function embeddingUrl() {
  return process.env.EMBEDDING_API_URL || "https://api.openai.com/v1/embeddings";
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEmbeddings(inputs: string[]): Promise<number[][] | null> {
  if (!inputs.length || !embeddingsConfigured()) return null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(embeddingUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EMBEDDING_API_KEY}` },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs, dimensions: EMBEDDING_DIMENSIONS }),
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`embedding endpoint returned ${response.status}`);
      const payload = await response.json() as { data?: { index: number; embedding: number[] }[] };
      const vectors = [...(payload.data ?? [])].sort((a, b) => a.index - b.index).map((item) => item.embedding);
      if (vectors.length !== inputs.length || vectors.some((vector) => vector.length !== EMBEDDING_DIMENSIONS)) {
        throw new Error("embedding response had an unexpected shape");
      }
      return vectors;
    } catch (error) {
      console.error("embedding_generation_failed", { attempt, model: EMBEDDING_MODEL, inputCount: inputs.length, error: error instanceof Error ? error.message : "unknown" });
      if (attempt < MAX_ATTEMPTS) await wait(200 * 2 ** (attempt - 1));
    }
  }
  return null;
}

function vectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}

export async function embedMaterialVersion(versionId: string) {
  if (!embeddingsConfigured()) return;
  const chunks = await db.contentChunk.findMany({ where: { versionId }, select: { id: true, text: true }, orderBy: { position: "asc" } });
  const vectors = await generateEmbeddings(chunks.map((chunk) => chunk.text));
  if (!vectors) return;
  await db.$transaction(chunks.map((chunk, index) => db.$executeRawUnsafe(
    `UPDATE "ContentChunk" SET "embedding" = $1::vector, "embeddingModel" = $2, "embeddedAt" = NOW() WHERE "id" = $3`,
    vectorLiteral(vectors[index]), EMBEDDING_MODEL, chunk.id
  )));
}

export async function embedMaterial(materialId: string) {
  if (!embeddingsConfigured()) return;
  const version = await db.learningMaterialVersion.findFirst({ where: { materialId }, orderBy: { version: "desc" }, select: { id: true } });
  if (version) await embedMaterialVersion(version.id);
}

export function asVectorLiteral(vector: number[]) {
  return vectorLiteral(vector);
}

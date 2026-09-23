import "server-only";
import type { Prisma } from "@prisma/client";
import { conceptSimilarity, normalizeConceptLabel } from "./concept-matching.mjs";
import { slugify } from "./text";

const AUTO_MATCH_THRESHOLD = 0.9;

type ConceptClient = Prisma.TransactionClient;

/** Resolve an analyzer label through canonical names and aliases before creating data. */
export async function resolveConcept(tx: ConceptClient, courseId: string, candidate: string) {
  const label = candidate.trim().replace(/\s+/g, " ");
  const normalizedLabel = normalizeConceptLabel(label);
  if (!normalizedLabel) throw new Error("El concepto no puede estar vacío.");

  const concepts = await tx.concept.findMany({
    where: { courseId, mergedAt: null },
    include: { aliases: true }
  });
  const exact = concepts.find((concept) =>
    normalizeConceptLabel(concept.name) === normalizedLabel ||
    concept.aliases.some((alias) => alias.normalizedLabel === normalizedLabel)
  );
  if (exact) {
    await tx.conceptAlias.upsert({
      where: { conceptId_normalizedLabel: { conceptId: exact.id, normalizedLabel } },
      update: {},
      create: { conceptId: exact.id, label, normalizedLabel, source: "AI", similarity: 1 }
    });
    return exact;
  }

  const best = concepts
    .map((concept) => ({ concept, similarity: Math.max(
      conceptSimilarity(label, concept.name),
      ...concept.aliases.map((alias) => conceptSimilarity(label, alias.label))
    ) }))
    .sort((a, b) => b.similarity - a.similarity)[0];
  if (best && best.similarity >= AUTO_MATCH_THRESHOLD) {
    await tx.conceptAlias.create({ data: {
      conceptId: best.concept.id, label, normalizedLabel, source: "AI", similarity: best.similarity
    } });
    return best.concept;
  }

  const baseSlug = slugify(label) || "concepto";
  let slug = baseSlug;
  let suffix = 2;
  while (await tx.concept.findUnique({ where: { courseId_slug: { courseId, slug } } })) slug = `${baseSlug}-${suffix++}`;
  return tx.concept.create({ data: {
    courseId, name: label, slug,
    aliases: { create: { label, normalizedLabel, source: "AI", similarity: best?.similarity } }
  } });
}

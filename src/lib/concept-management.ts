import "server-only";
import { db } from "./db";
import { refreshCourseInsights } from "./analysis";
import { conceptSimilarity, normalizeConceptLabel } from "./concept-matching.mjs";
import { slugify } from "./text";

export async function refreshConceptMergeSuggestions(courseId: string) {
  const threshold = Math.max(2, Number(process.env.INSIGHT_MIN_PARTICIPANTS || 3));
  const concepts = await db.concept.findMany({
    where: { courseId, mergedAt: null, insights: { some: { affectedParticipants: { gt: 0 } } } },
    include: { aliases: true, signals: { select: { participantKey: true } } }
  });
  for (let i = 0; i < concepts.length; i++) for (let j = i + 1; j < concepts.length; j++) {
    const left = concepts[i]; const right = concepts[j];
    const similarity = Math.max(conceptSimilarity(left.name, right.name), ...left.aliases.flatMap(a => right.aliases.map(b => conceptSimilarity(a.label, b.label))));
    const participants = new Set([...left.signals, ...right.signals].map(s => s.participantKey)).size;
    if (similarity >= 0.65 && similarity < 0.9 && participants >= threshold) {
      await db.conceptMergeSuggestion.upsert({
        where: { sourceConceptId_targetConceptId: { sourceConceptId: right.id, targetConceptId: left.id } },
        update: { similarity }, create: { courseId, sourceConceptId: right.id, targetConceptId: left.id, similarity }
      });
    }
  }
}

export async function mergeConcepts(courseId: string, sourceConceptId: string, targetConceptId: string, actorId?: string) {
  if (sourceConceptId === targetConceptId) throw new Error("Elegí dos conceptos diferentes.");
  await db.$transaction(async tx => {
    const [source, target] = await Promise.all([
      tx.concept.findFirst({ where: { id: sourceConceptId, courseId, mergedAt: null }, include: { aliases: true, insights: true } }),
      tx.concept.findFirst({ where: { id: targetConceptId, courseId, mergedAt: null }, include: { aliases: true, insights: true } })
    ]);
    if (!source || !target) throw new Error("Concepto no disponible.");
    const targetLabels = new Set(target.aliases.map(a => a.normalizedLabel));
    const aliases = [...source.aliases, { label: source.name, normalizedLabel: normalizeConceptLabel(source.name), similarity: 1 }];
    for (const alias of aliases) if (!targetLabels.has(alias.normalizedLabel)) {
      await tx.conceptAlias.create({ data: { conceptId: target.id, label: alias.label, normalizedLabel: alias.normalizedLabel, source: "SYSTEM", similarity: alias.similarity } });
      targetLabels.add(alias.normalizedLabel);
    }
    await tx.conceptAlias.deleteMany({ where: { conceptId: source.id } });
    await tx.conceptSignal.updateMany({ where: { conceptId: source.id }, data: { conceptId: target.id } });
    const sourceInsight = source.insights[0]; const targetInsight = target.insights[0];
    if (sourceInsight) {
      if (targetInsight) {
        await tx.recommendation.updateMany({ where: { insightId: sourceInsight.id }, data: { insightId: targetInsight.id } });
        await tx.teacherIntervention.updateMany({ where: { insightId: sourceInsight.id }, data: { insightId: targetInsight.id } });
        await tx.aggregatedInsight.delete({ where: { id: sourceInsight.id } });
      } else await tx.aggregatedInsight.update({ where: { id: sourceInsight.id }, data: { conceptId: target.id } });
    }
    await tx.concept.update({ where: { id: source.id }, data: { mergedIntoConceptId: target.id, mergedAt: new Date() } });
    await tx.conceptMergeSuggestion.updateMany({ where: { courseId, OR: [{ sourceConceptId: source.id }, { targetConceptId: source.id }] }, data: { status: "MERGED", resolvedAt: new Date() } });
    await tx.conceptChange.create({ data: { courseId, type: "MERGE", actorId, details: { sourceConceptId, targetConceptId } } });
  });
  await refreshCourseInsights(courseId);
}

export async function keepConceptsSeparate(courseId: string, suggestionId: string) {
  return db.conceptMergeSuggestion.updateMany({ where: { id: suggestionId, courseId, status: "PENDING" }, data: { status: "KEPT_SEPARATE", resolvedAt: new Date() } });
}

export async function renameConcept(courseId: string, conceptId: string, name: string, actorId?: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2) throw new Error("Ingresá un nombre válido.");
  await db.$transaction(async tx => {
    const concept = await tx.concept.findFirst({ where: { id: conceptId, courseId, mergedAt: null } });
    if (!concept) throw new Error("Concepto no disponible.");
    await tx.conceptAlias.upsert({ where: { conceptId_normalizedLabel: { conceptId, normalizedLabel: normalizeConceptLabel(concept.name) } }, update: {}, create: { conceptId, label: concept.name, normalizedLabel: normalizeConceptLabel(concept.name), source: "SYSTEM" } });
    const desiredSlug = slugify(clean) || "concepto";
    const collision = await tx.concept.findUnique({ where: { courseId_slug: { courseId, slug: desiredSlug } } });
    await tx.concept.update({ where: { id: conceptId }, data: { name: clean, slug: !collision || collision.id === conceptId ? desiredSlug : concept.slug } });
    await tx.conceptAlias.upsert({ where: { conceptId_normalizedLabel: { conceptId, normalizedLabel: normalizeConceptLabel(clean) } }, update: { label: clean, source: "TEACHER" }, create: { conceptId, label: clean, normalizedLabel: normalizeConceptLabel(clean), source: "TEACHER" } });
    await tx.conceptChange.create({ data: { courseId, type: "RENAME", actorId, details: { conceptId, previousName: concept.name, name: clean } } });
  });
  await refreshCourseInsights(courseId);
}

export async function splitConcept(courseId: string, conceptId: string, name: string, aliasIds: string[], signalIds: string[], actorId?: string) {
  if (!aliasIds.length && !signalIds.length) throw new Error("Seleccioná aliases o señales para separar.");
  const clean = name.trim().replace(/\s+/g, " ");
  await db.$transaction(async tx => {
    const source = await tx.concept.findFirst({ where: { id: conceptId, courseId, mergedAt: null } });
    if (!source) throw new Error("Concepto no disponible.");
    const created = await tx.concept.create({ data: { courseId, name: clean, slug: `${slugify(clean)}-${Date.now().toString(36)}`, aliases: { create: { label: clean, normalizedLabel: normalizeConceptLabel(clean), source: "TEACHER" } } } });
    await tx.conceptAlias.updateMany({ where: { id: { in: aliasIds }, conceptId }, data: { conceptId: created.id } });
    await tx.conceptSignal.updateMany({ where: { id: { in: signalIds }, conceptId }, data: { conceptId: created.id } });
    await tx.conceptChange.create({ data: { courseId, type: "SPLIT", actorId, details: { sourceConceptId: conceptId, createdConceptId: created.id, aliasIds, signalIds } } });
  });
  await refreshCourseInsights(courseId);
}

import "server-only";
import { db } from "./db";
import { getAIProvider } from "./ai";
import { participantKey as makeParticipantKey } from "./privacy";
import { slugify, normalizeText } from "./text";
import { aggregateConceptSignals, anonymizeSnippet } from "./domain.mjs";
import { ANALYSIS_SCHEMA, validateAnalysisPayload } from "./analysis-schema.mjs";

type AnalysisOutput = { concepts: Array<{ concept: string; signals: Array<{ type: "QUESTION" | "CONFUSION" | "REFORMULATION"; evidence_message_id: string; evidence_snippet: string }>; explanation_patterns: Array<{ type: "CONCRETE_EXAMPLE" | "ANALOGY" | "STEP_BY_STEP" | "DEFINITION" | "COMPARISON" | "APPLIED_CASE" | "OTHER"; observed_signal: "EXPLICIT_CONFIRMATION" | "ADVANCED_WITHOUT_REPETITION" | "REDUCED_CONFUSION" | "NONE"; evidence_message_id: string }> }> };

function localAnalysis(messages: { id: string; role: string; content: string }[]): AnalysisOutput {
  const concepts = new Map<string, AnalysisOutput["concepts"][number]>();
  const studentMessages = messages.filter((m) => m.role === "STUDENT");
  for (const m of studentMessages) {
    const t = m.content.trim();
    const lower = normalizeText(t);
    const isQuestion = /\?|\b(que|como|por que|cual|diferencia|entiendo|confunde|confusion)\b/.test(lower);
    if (!isQuestion) continue;
    let concept = "tema consultado";
    const diff = t.match(/diferencia\s+(?:entre\s+)?(.{3,80})/i);
    const what = t.match(/(?:qué|que)\s+es\s+(.{3,60})/i);
    if (diff) concept = diff[1].replace(/[?.!].*$/, "").trim();
    else if (what) concept = what[1].replace(/[?.!].*$/, "").trim();
    else {
      const words = lower.split(" ").filter((w) => w.length > 5 && !["porque", "cuando", "donde", "puedes", "podria", "explicar", "entiendo"].includes(w));
      concept = words.slice(0, 4).join(" ") || "tema consultado";
    }
    const key = slugify(concept);
    if (!concepts.has(key)) concepts.set(key, { concept, signals: [], explanation_patterns: [] });
    concepts.get(key)!.signals.push({ type: lower.includes("conf") || lower.includes("no entiendo") ? "CONFUSION" : "QUESTION", evidence_message_id: m.id, evidence_snippet: t });
  }
  return { concepts: [...concepts.values()].slice(0, 8) };
}

export async function analyzeConversation(conversationId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: "asc" } }, course: true }
  });
  if (!conversation || conversation.status === "DELETED") return;

  const provider = getAIProvider();
  const serialized = conversation.messages.map((m) => `[${m.id}] ${m.role}: ${m.content}`).join("\n");
  let output: AnalysisOutput;
  if (provider.name === "local-development") output = localAnalysis(conversation.messages);
  else {
    output = await provider.structured<AnalysisOutput>({
      name: "educai_conversation_analysis",
      schema: ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      messages: [
        { role: "system", content: "Analizá evidencia pedagógica observable en una conversación estudiante-tutor. Detectá conceptos con preguntas, confusión o reformulaciones. Detectá tipos de explicación solo si hay una señal observable posterior. No diagnostiques personas ni infieras estilos de aprendizaje. Usá únicamente los message IDs provistos. Devolvé conceptos concretos, no temas genéricos." },
        { role: "user", content: serialized }
      ]
    }, validateAnalysisPayload as (value: unknown) => AnalysisOutput);
  }
  const knownMessageIds = new Set(conversation.messages.map((m) => m.id));
  output = { concepts: output.concepts.map((c) => ({
    ...c,
    signals: c.signals.filter((s) => knownMessageIds.has(s.evidence_message_id)),
    explanation_patterns: c.explanation_patterns.filter((p) => knownMessageIds.has(p.evidence_message_id))
  })).filter((c) => c.signals.length > 0) };

  const pKey = makeParticipantKey(conversation.courseId, conversation.studentId);
  await db.$transaction(async (tx) => {
    await tx.conversationAnalysis.deleteMany({ where: { conversationId } });
    const analysis = await tx.conversationAnalysis.create({ data: { conversationId, participantKey: pKey, modelProvider: provider.name, modelName: provider.model } });
    for (const conceptResult of output.concepts) {
      const slug = slugify(conceptResult.concept);
      const concept = await tx.concept.upsert({ where: { courseId_slug: { courseId: conversation.courseId, slug } }, update: { name: conceptResult.concept }, create: { courseId: conversation.courseId, name: conceptResult.concept, slug } });
      const patternByMessage = new Map(conceptResult.explanation_patterns.map((p) => [p.evidence_message_id, p]));
      const defaultPattern = conceptResult.explanation_patterns.find((p) => p.observed_signal !== "NONE");
      let usedDefaultPattern = false;
      for (const signal of conceptResult.signals) {
        const pattern = patternByMessage.get(signal.evidence_message_id) ?? (!usedDefaultPattern ? defaultPattern : undefined);
        if (pattern === defaultPattern && pattern) usedDefaultPattern = true;
        await tx.conceptSignal.create({ data: {
          analysisId: analysis.id,
          conceptId: concept.id,
          participantKey: pKey,
          type: signal.type,
          evidenceSnippet: anonymizeSnippet(signal.evidence_snippet),
          explanationType: pattern?.type,
          understandingSignal: pattern?.observed_signal ?? "NONE"
        } });
      }
    }
  });
  await refreshCourseInsights(conversation.courseId);
}

export async function refreshCourseInsights(courseId: string) {
  const threshold = Math.max(2, Number(process.env.INSIGHT_MIN_PARTICIPANTS || 3));
  const [participantRows, signals, concepts] = await Promise.all([
    db.conversationAnalysis.findMany({ where: { conversation: { courseId } }, distinct: ["participantKey"], select: { participantKey: true } }),
    db.conceptSignal.findMany({ where: { concept: { courseId } }, select: { conceptId: true, participantKey: true, evidenceSnippet: true, explanationType: true, understandingSignal: true } }),
    db.concept.findMany({ where: { courseId } })
  ]);
  const totalParticipants = participantRows.length;
  const aggregates = aggregateConceptSignals(signals, totalParticipants, threshold);
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const activeConceptIds = new Set(aggregates.map((a) => a.conceptKey));
  const staleInsights = await db.aggregatedInsight.findMany({ where: { courseId, conceptId: { notIn: [...activeConceptIds] } }, include: { concept: true } });
  for (const stale of staleInsights) {
    await db.aggregatedInsight.update({ where: { id: stale.id }, data: { affectedParticipants: 0, totalParticipants, proportion: 0, evidenceState: "NO_DATA", summary: `No hay señales actuales suficientes sobre “${stale.concept.name}”.`, evidenceJson: [], explanationJson: [], generatedAt: new Date() } });
  }

  for (const aggregate of aggregates) {
    const concept = conceptById.get(aggregate.conceptKey);
    if (!concept) continue;
    const pct = Math.round(aggregate.proportion * 100);
    const summary = aggregate.evidenceState === "SUFFICIENT"
      ? `En ${aggregate.affectedParticipants} estudiantes/conversaciones independientes aparecen señales de duda sobre “${concept.name}” (${pct}% de quienes participaron en conversaciones analizadas).`
      : `Aparecen señales sobre “${concept.name}”, pero todavía no hay suficiente evidencia para identificar un patrón agregado.`;
    const insight = await db.aggregatedInsight.upsert({
      where: { courseId_conceptId: { courseId, conceptId: concept.id } },
      update: { affectedParticipants: aggregate.affectedParticipants, totalParticipants, proportion: aggregate.proportion, evidenceState: aggregate.evidenceState, summary, evidenceJson: aggregate.evidence, explanationJson: aggregate.explanations, generatedAt: new Date() },
      create: { courseId, conceptId: concept.id, affectedParticipants: aggregate.affectedParticipants, totalParticipants, proportion: aggregate.proportion, evidenceState: aggregate.evidenceState, summary, evidenceJson: aggregate.evidence, explanationJson: aggregate.explanations }
    });
    if (aggregate.evidenceState === "SUFFICIENT") await ensureRecommendation(insight.id, courseId, concept.name, summary, aggregate.explanations);
  }
}

async function ensureRecommendation(insightId: string, courseId: string, conceptName: string, summary: string, explanations: Array<{ type: string; observedSignal: string; count: number }>) {
  const existing = await db.recommendation.findFirst({ where: { insightId } });
  if (existing) return existing;
  const strongest = explanations[0]?.type;
  const adaptation = strongest
    ? `Retomar “${conceptName}” con una explicación ${strongest.toLowerCase().replaceAll("_", " ")} y pedir una justificación breve para comprobar si disminuye la confusión.`
    : `Antes de avanzar, dedicar 10 minutos a “${conceptName}” con tres casos contrastantes y pedir que el grupo justifique la diferencia entre ellos.`;
  return db.recommendation.create({ data: {
    courseId, insightId,
    title: `Reforzar ${conceptName}`,
    rationale: summary,
    actionText: adaptation
  } });
}

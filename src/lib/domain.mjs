export const DEFAULT_MIN_PARTICIPANTS = 3;

/** @returns {"NO_DATA" | "SUFFICIENT" | "INSUFFICIENT"} */
export function evidenceState(participants, threshold = DEFAULT_MIN_PARTICIPANTS) {
  if (!Number.isFinite(participants) || participants <= 0) return "NO_DATA";
  return participants >= threshold ? "SUFFICIENT" : "INSUFFICIENT";
}

export function aggregateConceptSignals(signals, totalParticipants, threshold = DEFAULT_MIN_PARTICIPANTS) {
  const byConcept = new Map();
  for (const signal of signals) {
    const key = signal.conceptId ?? signal.conceptSlug ?? signal.concept;
    if (!key) continue;
    if (!byConcept.has(key)) byConcept.set(key, { participants: new Set(), evidence: [], explanations: new Map() });
    const bucket = byConcept.get(key);
    if (signal.participantKey) bucket.participants.add(signal.participantKey);
    if (signal.evidenceSnippet && bucket.evidence.length < 5) bucket.evidence.push(anonymizeSnippet(signal.evidenceSnippet));
    if (signal.explanationType && signal.understandingSignal && signal.understandingSignal !== "NONE") {
      const exKey = `${signal.explanationType}:${signal.understandingSignal}`;
      bucket.explanations.set(exKey, (bucket.explanations.get(exKey) ?? 0) + 1);
    }
  }

  return [...byConcept.entries()].map(([conceptKey, bucket]) => {
    const affectedParticipants = bucket.participants.size;
    return {
      conceptKey,
      affectedParticipants,
      totalParticipants,
      proportion: totalParticipants > 0 ? affectedParticipants / totalParticipants : 0,
      evidenceState: evidenceState(affectedParticipants, threshold),
      evidence: bucket.evidence,
      explanations: [...bucket.explanations.entries()].map(([key, count]) => {
        const [type, observedSignal] = key.split(":");
        return { type, observedSignal, count };
      }).sort((a, b) => b.count - a.count)
    };
  });
}

export function anonymizeSnippet(text, maxLength = 220) {
  if (!text) return "";
  const noEmails = String(text).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
  const noPhones = noEmails.replace(/(?:\+?\d[\s().-]?){7,}\d/g, "[teléfono]");
  const noStudentCodes = noPhones.replace(/\b(?:legajo|student|alumno|id)\s*[:#-]?\s*[A-Z0-9-]{4,}\b/gi, "[identificador]");
  return noStudentCodes.length > maxLength ? `${noStudentCodes.slice(0, maxLength - 1)}…` : noStudentCodes;
}

const recommendationTransitions = {
  GENERATED: new Set(["VIEWED", "APPLIED", "DISCARDED"]),
  VIEWED: new Set(["APPLIED", "DISCARDED"]),
  APPLIED: new Set(),
  DISCARDED: new Set()
};

export function canTransitionRecommendation(from, to) {
  if (from === to) return true;
  return recommendationTransitions[from]?.has(to) ?? false;
}

export function assertRecommendationTransition(from, to) {
  if (!canTransitionRecommendation(from, to)) throw new Error(`Invalid recommendation transition: ${from} -> ${to}`);
  return to;
}

export function validateFeedbackAssociation({ feedbackCourseId, sessionCourseId, conceptCourseId }) {
  if (!feedbackCourseId || feedbackCourseId !== sessionCourseId) {
    throw new Error("Feedback must reference a session from the same course");
  }
  return true;
}

/** ClassFeedback is session-scoped in the current model (it has no conceptId). */
export function validateClassFeedbackAssociation({ feedbackCourseId, sessionCourseId, feedbackStudentId, enrolledStudentIds = [] }) {
  validateFeedbackAssociation({ feedbackCourseId, sessionCourseId });
  if (!feedbackStudentId || !new Set(enrolledStudentIds).has(feedbackStudentId)) {
    throw new Error("Feedback student must be enrolled in the session course");
  }
  return true;
}

export function prePostDescriptor({ beforeAffected, beforeTotal, afterDoubt, afterTotal }) {
  const beforeRate = beforeTotal > 0 ? beforeAffected / beforeTotal : null;
  const afterRate = afterTotal > 0 ? afterDoubt / afterTotal : null;
  return {
    before: { metric: "conversations_with_difficulty_signal", affected: beforeAffected, sample: beforeTotal, rate: beforeRate },
    after: { metric: "feedback_still_unclear", affected: afterDoubt, sample: afterTotal, rate: afterRate },
    comparableAsCausalEffect: false,
    limitation: "Las métricas provienen de fuentes y muestras diferentes; el cambio observado no demuestra causalidad."
  };
}

export function conceptTrend(previousParticipants, currentParticipants, threshold = DEFAULT_MIN_PARTICIPANTS, relevantDelta = 2) {
  if (currentParticipants <= 0) return "NO_DATA";
  if (previousParticipants < threshold && currentParticipants >= threshold) return "NEW";
  const delta = currentParticipants - previousParticipants;
  if (delta >= relevantDelta) return "RISING";
  if (delta <= -relevantDelta) return "FALLING";
  return "STABLE";
}

export function comparisonWindows(events, appliedAt) {
  const boundary = new Date(appliedAt).getTime();
  return {
    before: events.filter((event) => new Date(event.at).getTime() < boundary),
    after: events.filter((event) => new Date(event.at).getTime() >= boundary)
  };
}

const interventionTransitions = {
  PLANNED: new Set(["APPLIED", "SKIPPED"]),
  APPLIED: new Set(),
  SKIPPED: new Set()
};

export function canTransitionIntervention(from, to) {
  if (from === to) return true;
  return interventionTransitions[from]?.has(to) ?? false;
}

/** Resolve aliases before aggregation so one participant is never counted twice. */
export function resolveConceptAliases(signals, aliases = {}) {
  return signals.map((signal) => ({ ...signal, conceptId: aliases[signal.conceptId] ?? signal.conceptId }));
}

export function mergeConceptSignals(signals, sourceConceptIds, targetConceptId) {
  const sources = new Set(sourceConceptIds);
  return signals.map((signal) => sources.has(signal.conceptId) ? { ...signal, conceptId: targetConceptId } : signal);
}

export function splitConceptSignals(signals, sourceConceptId, targetConceptId, signalIds) {
  const selected = new Set(signalIds);
  return signals.map((signal) => signal.conceptId === sourceConceptId && selected.has(signal.id)
    ? { ...signal, conceptId: targetConceptId }
    : signal);
}

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
    if (!byConcept.has(key)) byConcept.set(key, { participants: new Set(), sessions: new Set(), evidence: [], explanations: new Map(), signalCount: 0, reformulationCount: 0, firstDetectedAt: null, lastDetectedAt: null });
    const bucket = byConcept.get(key);
    if (signal.participantKey) bucket.participants.add(signal.participantKey);
    if (signal.conversationId) bucket.sessions.add(signal.conversationId);
    bucket.signalCount += 1;
    if (signal.type === "REFORMULATION") bucket.reformulationCount += 1;
    if (signal.createdAt) {
      const detectedAt = new Date(signal.createdAt);
      if (!Number.isNaN(detectedAt.valueOf())) {
        if (!bucket.firstDetectedAt || detectedAt < bucket.firstDetectedAt) bucket.firstDetectedAt = detectedAt;
        if (!bucket.lastDetectedAt || detectedAt > bucket.lastDetectedAt) bucket.lastDetectedAt = detectedAt;
      }
    }
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
      signalCount: bucket.signalCount,
      reformulationCount: bucket.reformulationCount,
      sessionCount: bucket.sessions.size,
      firstDetectedAt: bucket.firstDetectedAt,
      lastDetectedAt: bucket.lastDetectedAt,
      evidence: bucket.evidence,
      explanations: [...bucket.explanations.entries()].map(([key, count]) => {
        const [type, observedSignal] = key.split(":");
        return { type, observedSignal, count };
      }).sort((a, b) => b.count - a.count)
    };
  });
}

export function insightTrend(previousParticipants, currentParticipants) {
  if (previousParticipants <= 0 && currentParticipants > 0) return "NEW";
  if (currentParticipants > previousParticipants) return "RISING";
  if (currentParticipants < previousParticipants) return "FALLING";
  return "STABLE";
}

const teacherInsightTransitions = {
  OPEN: new Set(["ACKNOWLEDGED", "ACTION_PLANNED", "DISMISSED", "RESOLVED", "MONITORING"]),
  ACKNOWLEDGED: new Set(["ACTION_PLANNED", "DISMISSED", "RESOLVED", "MONITORING"]),
  ACTION_PLANNED: new Set(["ACKNOWLEDGED", "DISMISSED", "RESOLVED", "MONITORING"]),
  MONITORING: new Set(["ACTION_PLANNED", "DISMISSED", "RESOLVED", "ACKNOWLEDGED"]),
  DISMISSED: new Set(["ACKNOWLEDGED", "MONITORING"]),
  RESOLVED: new Set(["MONITORING", "ACKNOWLEDGED"])
};

export function canTransitionTeacherInsight(from, to) {
  return from === to || (teacherInsightTransitions[from]?.has(to) ?? false);
}

export function assertTeacherInsightTransition(from, to) {
  if (!canTransitionTeacherInsight(from, to)) throw new Error(`Invalid teacher insight transition: ${from} -> ${to}`);
  return to;
}

export function canTransitionIntervention(from, to) {
  return from === to || (from === "PLANNED" && (to === "APPLIED" || to === "SKIPPED"));
}

export function validateInterventionWorkflow({ recommendationId, conceptId, status, sessionId }) {
  if (!recommendationId || !conceptId) throw new Error("A planned intervention must retain its recommendation and concept");
  if (status === "PLANNED" && sessionId) throw new Error("A planned intervention is associated with a session only when resolved");
  if ((status === "APPLIED" || status === "SKIPPED") && !sessionId) throw new Error("Applied or skipped interventions require a session");
  if (!["PLANNED", "APPLIED", "SKIPPED"].includes(status)) throw new Error("Unknown intervention status");
  return true;
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
  if (!feedbackCourseId || feedbackCourseId !== sessionCourseId || feedbackCourseId !== conceptCourseId) {
    throw new Error("Feedback must reference a session and concept from the same course");
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

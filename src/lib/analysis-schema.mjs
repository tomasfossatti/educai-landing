export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    concepts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          concept: { type: "string" },
          signals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["QUESTION", "CONFUSION", "REFORMULATION"] },
                evidence_message_id: { type: "string" },
                evidence_snippet: { type: "string" }
              },
              required: ["type", "evidence_message_id", "evidence_snippet"],
              additionalProperties: false
            }
          },
          explanation_patterns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["CONCRETE_EXAMPLE", "ANALOGY", "STEP_BY_STEP", "DEFINITION", "COMPARISON", "APPLIED_CASE", "OTHER"] },
                observed_signal: { type: "string", enum: ["EXPLICIT_CONFIRMATION", "ADVANCED_WITHOUT_REPETITION", "REDUCED_CONFUSION", "NONE"] },
                evidence_message_id: { type: "string" }
              },
              required: ["type", "observed_signal", "evidence_message_id"],
              additionalProperties: false
            }
          }
        },
        required: ["concept", "signals", "explanation_patterns"],
        additionalProperties: false
      }
    }
  },
  required: ["concepts"],
  additionalProperties: false
};

export function validateAnalysisPayload(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.concepts)) throw new Error("Invalid analysis output");
  const concepts = value.concepts.map((item) => {
    if (!item || typeof item.concept !== "string" || !Array.isArray(item.signals) || !Array.isArray(item.explanation_patterns)) throw new Error("Invalid concept analysis");
    const signals = item.signals.map((s) => {
      if (!["QUESTION", "CONFUSION", "REFORMULATION"].includes(s?.type) || typeof s?.evidence_message_id !== "string" || typeof s?.evidence_snippet !== "string") throw new Error("Invalid signal");
      return { type: s.type, evidence_message_id: s.evidence_message_id, evidence_snippet: s.evidence_snippet };
    });
    const explanation_patterns = item.explanation_patterns.map((p) => {
      if (!["CONCRETE_EXAMPLE", "ANALOGY", "STEP_BY_STEP", "DEFINITION", "COMPARISON", "APPLIED_CASE", "OTHER"].includes(p?.type)) throw new Error("Invalid explanation type");
      if (!["EXPLICIT_CONFIRMATION", "ADVANCED_WITHOUT_REPETITION", "REDUCED_CONFUSION", "NONE"].includes(p?.observed_signal) || typeof p?.evidence_message_id !== "string") throw new Error("Invalid understanding signal");
      return { type: p.type, observed_signal: p.observed_signal, evidence_message_id: p.evidence_message_id };
    });
    return { concept: item.concept.trim().slice(0, 160), signals, explanation_patterns };
  }).filter((c) => c.concept && c.signals.length);
  return { concepts };
}

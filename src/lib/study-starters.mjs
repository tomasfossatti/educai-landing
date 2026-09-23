export const STUDY_STARTERS = Object.freeze([
  { intent: "EXPLAIN", label: "Explicámelo", message: "Explicame el contenido de esta actividad de una manera clara y paso a paso." },
  { intent: "EXAMPLE", label: "Dame un ejemplo", message: "Dame un ejemplo que me ayude a comprender mejor el contenido de esta actividad." },
  { intent: "COMPARE", label: "Compará conceptos", message: "Compará los conceptos principales de esta actividad y ayudame a distinguirlos." },
  { intent: "PRACTICE", label: "Haceme preguntas", message: "Haceme preguntas para practicar el contenido de esta actividad." },
  { intent: "DIAGNOSE", label: "Ayudame a encontrar qué no entiendo", message: "Ayudame a encontrar qué parte del contenido de esta actividad todavía no entiendo." }
]);

// Both starter-generated and freely written text cross this same boundary before
// authorization, retrieval, tutor generation, persistence and analysis.
export function chatPipelineInput(formValue) {
  return String(formValue ?? "").trim();
}

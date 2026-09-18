import "server-only";
import { getAIProvider } from "./ai";
import { retrieveContext } from "./rag";

export async function tutorReply(args: { courseId: string; courseName: string; studentText: string; history: { role: "STUDENT" | "ASSISTANT"; content: string }[] }) {
  const sources = await retrieveContext(args.courseId, args.studentText, 5);
  const context = sources.map((s, i) => `[F${i + 1}] ${s.material.title}\n${s.text}`).join("\n\n");
  const provider = getAIProvider();
  const system = `Sos el tutor de Educai para el curso “${args.courseName}”.\n\nCONTEXTO VALIDADO:\n${context || "(sin fragmentos relevantes recuperados)"}\n\nREGLAS:\n- Priorizá estrictamente el contenido validado.\n- Ayudá a comprender; no resuelvas mecánicamente si una pregunta pedagógica puede ayudar.\n- Podés usar definición, comparación, ejemplo, analogía o paso a paso según convenga.\n- Si el material no respalda una afirmación, decilo explícitamente y no inventes una fuente.\n- No digas que sabés características personales permanentes del estudiante.\n- Respondé en español claro y conciso.\n- No menciones IDs internos ni datos de otros estudiantes.`;
  const history = args.history.slice(-10).map((m) => ({ role: m.role === "STUDENT" ? "user" as const : "assistant" as const, content: m.content }));
  const content = await provider.complete([{ role: "system", content: system }, ...history, { role: "user", content: args.studentText }]);
  return { content, sourceChunkIds: sources.map((s) => s.id), provider: provider.name, model: provider.model };
}

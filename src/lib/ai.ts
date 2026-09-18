import "server-only";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type StructuredRequest = { name: string; schema: Record<string, unknown>; messages: AIMessage[] };

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(messages: AIMessage[]): Promise<string>;
  structured<T>(request: StructuredRequest, validate: (value: unknown) => T): Promise<T>;
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") parts.push(content.text);
      else if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  private key() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
    return key;
  }
  private async request(body: Record<string, unknown>) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key()}` },
      body: JSON.stringify({ model: this.model, store: false, ...body }),
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`OpenAI request failed: ${res.status} ${await res.text()}`);
    return res.json();
  }
  async complete(messages: AIMessage[]) {
    const payload = await this.request({ input: messages });
    const text = extractOutputText(payload);
    if (!text) throw new Error("OpenAI returned no text output");
    return text;
  }
  async structured<T>(request: StructuredRequest, validate: (value: unknown) => T) {
    const payload = await this.request({
      input: request.messages,
      text: { format: { type: "json_schema", name: request.name, strict: true, schema: request.schema } }
    });
    const text = extractOutputText(payload);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new Error("Structured AI output was not valid JSON"); }
    return validate(parsed);
  }
}

class LocalDevelopmentProvider implements AIProvider {
  readonly name = "local-development";
  readonly model = "deterministic-dev";
  async complete(messages: AIMessage[]) {
    const context = messages.find((m) => m.role === "system")?.content ?? "";
    const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const excerpt = context.match(/CONTEXTO VALIDADO:\n([\s\S]*?)\n\nREGLAS/)?.[1]?.trim();
    if (!excerpt) return "No encuentro respaldo suficiente en el material validado del curso para responder con seguridad. ¿Querés reformular la pregunta o pedirle al docente que agregue material sobre este tema?";
    return `Modo de desarrollo local: según el material validado, el punto más relacionado con tu pregunta es:\n\n${excerpt.slice(0, 900)}\n\nPara comprobar comprensión: ¿cómo explicarías con tus palabras qué parte de esto responde a “${question.slice(0, 120)}”?`;
  }
  async structured<T>(_request: StructuredRequest, _validate: (value: unknown) => T): Promise<T> {
    throw new Error("Local development provider does not synthesize structured analysis. ConversationAnalysisService uses deterministic heuristics in local mode.");
  }
}

export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "local") return new LocalDevelopmentProvider();
  if (provider === "openai") return new OpenAIProvider();
  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

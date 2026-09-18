import "server-only";
import { db } from "./db";
import { getAIProvider } from "./ai";

type FeedbackInsight = { summary: string; recommendation: string };

const FEEDBACK_INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    recommendation: { type: "string" }
  },
  required: ["summary", "recommendation"],
  additionalProperties: false
};

function validateInsight(value: unknown): FeedbackInsight {
  if (!value || typeof value !== "object") throw new Error("Feedback insight inválido");
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== "string" || typeof v.recommendation !== "string") throw new Error("Feedback insight incompleto");
  return { summary: v.summary.trim(), recommendation: v.recommendation.trim() };
}

function deterministicInsight(ratings: number[], comments: string[]): FeedbackInsight {
  const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
  const negative = ratings.filter((n) => n <= 2).length;
  const positive = ratings.filter((n) => n >= 3).length;
  const summary = `La clase recibió ${ratings.length} respuesta${ratings.length === 1 ? "" : "s"}, con un promedio de ${average.toFixed(1)}/4. ${positive} fueron positivas y ${negative} negativas.${comments.length ? ` Hay ${comments.length} comentario${comments.length === 1 ? "" : "s"} cualitativo${comments.length === 1 ? "" : "s"}.` : ""}`;
  const recommendation = average < 2.5
    ? "Para la próxima clase, reducí la cantidad de contenido nuevo, incorporá un ejemplo concreto temprano y hacé una pausa breve de comprobación antes de avanzar."
    : "Mantené la estructura que funcionó y agregá una comprobación breve a mitad de clase para detectar a tiempo qué parte necesita otra explicación o un ejemplo adicional.";
  return { summary, recommendation };
}

export async function refreshClassFeedbackInsight(sessionId: string) {
  const session = await db.classSession.findUnique({
    where: { id: sessionId },
    include: {
      course: true,
      classFeedback: { orderBy: { createdAt: "asc" }, select: { rating: true, comment: true } }
    }
  });
  if (!session || !session.classFeedback.length) return null;

  const ratings = session.classFeedback.map((f) => f.rating);
  const comments = session.classFeedback.map((f) => f.comment?.trim()).filter((v): v is string => Boolean(v));
  const fallback = deterministicInsight(ratings, comments);
  let insight = fallback;

  try {
    const provider = getAIProvider();
    if (provider.name !== "local-development") {
      const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length;
      insight = await provider.structured<FeedbackInsight>({
        name: "educai_class_feedback",
        schema: FEEDBACK_INSIGHT_SCHEMA,
        messages: [
          {
            role: "system",
            content: "Sos un asistente pedagógico para docentes universitarios. Analizá feedback anónimo de una clase y proponé UNA mejora concreta y aplicable para la próxima clase. No diagnostiques estudiantes, no identifiques personas, no inventes causas que no aparezcan en los datos. La recomendación debe ser breve, específica y práctica."
          },
          {
            role: "user",
            content: `Curso: ${session.course.name}\nClase: ${session.title}\nCantidad de respuestas: ${ratings.length}\nPromedio: ${average.toFixed(2)}/4\nDistribución: 1★=${ratings.filter(r=>r===1).length}, 2★=${ratings.filter(r=>r===2).length}, 3★=${ratings.filter(r=>r===3).length}, 4★=${ratings.filter(r=>r===4).length}\nComentarios anónimos:\n${comments.length ? comments.map((c,i)=>`${i+1}. ${c}`).join("\n") : "Sin comentarios."}`
          }
        ]
      }, validateInsight);
    }
  } catch (error) {
    console.error("No se pudo generar insight de feedback con IA; se usa fallback determinístico.", error);
  }

  await db.classSession.update({
    where: { id: sessionId },
    data: {
      feedbackSummary: insight.summary,
      feedbackRecommendation: insight.recommendation,
      feedbackGeneratedAt: new Date()
    }
  });

  return insight;
}

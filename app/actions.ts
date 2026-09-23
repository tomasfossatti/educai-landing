"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db, withDbRetry } from "@/src/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword, requireStudent, requireTeacher } from "@/src/lib/auth";
import { createMaterial } from "@/src/lib/materials";
import { tutorReply } from "@/src/lib/tutor";
import { analyzeConversation, refreshCourseInsights } from "@/src/lib/analysis";
import { refreshClassFeedbackInsight } from "@/src/lib/feedback";
import { assertRecommendationTransition } from "@/src/lib/domain.mjs";
import { PRIVACY_CONTRACT, hasAcceptedPrivacyContract } from "@/src/lib/privacy-contract.mjs";
import { chatPipelineInput } from "@/src/lib/study-starters.mjs";

export type FormActionState = { error: string | null };
export type ChatActionState = { error: string | null };

function value(fd: FormData, key: string) { return String(fd.get(key) ?? "").trim(); }
function required(fd: FormData, key: string, min = 1) {
  const v = value(fd, key);
  if (v.length < min) throw new Error(`${key} es obligatorio`);
  return v;
}
function safeRole(v: string) { if (v !== "STUDENT" && v !== "TEACHER") throw new Error("Rol inválido"); return v; }
function joinCode() { return crypto.randomBytes(4).toString("hex").toUpperCase(); }

async function teacherCourse(courseId: string) {
  const user = await requireTeacher();
  const course = await withDbRetry(() => db.course.findFirst({ where: { id: courseId, teacherId: user.teacher.id } }));
  if (!course) throw new Error("Curso no encontrado o sin permiso");
  return { user, course };
}

async function studentEnrollment(courseId: string) {
  const user = await requireStudent();
  const enrollment = await db.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: user.student.id } } });
  if (!enrollment) throw new Error("No estás inscripto en este curso");
  return { user, enrollment };
}

export async function registerAction(_previous: FormActionState, fd: FormData): Promise<FormActionState> {
  const name = value(fd, "name");
  const email = value(fd, "email").toLowerCase();
  const password = value(fd, "password");
  const roleValue = value(fd, "role");
  if (name.length < 2) return { error: "Ingresá tu nombre para continuar." };
  if (!email || !email.includes("@")) return { error: "Ingresá un email válido." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (roleValue !== "STUDENT" && roleValue !== "TEACHER") return { error: "Elegí si vas a usar Educai como estudiante o docente." };
  const role = safeRole(roleValue);

  try {
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return { error: "Ya existe una cuenta con ese email. Probá ingresar." };
    const { hash, salt } = hashPassword(password);
    const user = await db.user.create({ data: {
      name, email, role, passwordHash: hash, passwordSalt: salt,
      teacher: role === "TEACHER" ? { create: {} } : undefined,
      student: role === "STUDENT" ? { create: {} } : undefined
    } });
    await createSession(user.id);
  } catch (error) {
    console.error("No se pudo crear la cuenta.", error);
    return { error: "No pudimos crear la cuenta. Revisá tus datos e intentá nuevamente." };
  }

  redirect(role === "TEACHER" ? "/teacher" : "/student");
}

export async function loginAction(_previous: FormActionState, fd: FormData): Promise<FormActionState> {
  const email = value(fd, "email").toLowerCase();
  const password = value(fd, "password");
  if (!email || !password) return { error: "Completá email y contraseña para ingresar." };

  let destination = "/login";
  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return { error: "El email o la contraseña no coinciden." };
    }
    await createSession(user.id);
    destination = user.role === "TEACHER" ? "/teacher" : "/student";
  } catch (error) {
    console.error("No se pudo iniciar sesión.", error);
    return { error: "No pudimos iniciar sesión. Intentá nuevamente en unos segundos." };
  }

  redirect(destination);
}

export async function logoutAction() { await destroySession(); redirect("/login"); }

export async function createCourseAction(_previous: FormActionState, fd: FormData): Promise<FormActionState> {
  const user = await requireTeacher();
  const name = value(fd, "name");
  const description = value(fd, "description");
  if (name.length < 3) return { error: "El nombre del curso debe tener al menos 3 caracteres." };
  if (description.length < 10) return { error: "Agregá una descripción breve para orientar a tus estudiantes." };

  let courseId = "";
  try {
    let code = joinCode();
    while (await db.course.findUnique({ where: { joinCode: code } })) code = joinCode();
    const course = await db.course.create({ data: { teacherId: user.teacher.id, name, description, joinCode: code } });
    courseId = course.id;
  } catch (error) {
    console.error("No se pudo crear el curso.", error);
    return { error: "No pudimos crear el curso. Tus datos siguen en el formulario; intentá nuevamente." };
  }

  redirect(`/teacher/courses/${courseId}?view=summary&notice=course-created`);
}

export async function updateCourseAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  await db.course.update({ where: { id: courseId }, data: { name: required(fd, "name", 3), description: required(fd, "description", 10) } });
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=settings&notice=course-updated`);
}

export async function joinCourseAction(_previous: FormActionState, fd: FormData): Promise<FormActionState> {
  const user = await requireStudent();
  const code = value(fd, "joinCode").toUpperCase();
  if (!code) return { error: "Ingresá el código que te compartió tu docente." };

  let courseId = "";
  try {
    const course = await db.course.findUnique({ where: { joinCode: code } });
    if (!course) return { error: "No encontramos un curso con ese código. Revisalo e intentá nuevamente." };
    await db.enrollment.upsert({ where: { courseId_studentId: { courseId: course.id, studentId: user.student.id } }, update: {}, create: { courseId: course.id, studentId: user.student.id } });
    courseId = course.id;
  } catch (error) {
    console.error("No se pudo unir al curso.", error);
    return { error: "No pudimos sumarte al curso. Intentá nuevamente." };
  }

  redirect(`/student/courses/${courseId}?notice=joined`);
}

export async function createActivityAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  await db.activity.create({ data: { courseId, title: required(fd, "title", 3), description: required(fd, "description", 5) } });
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=activities&notice=activity-created`);
}

export async function createMaterialAction(_previous: FormActionState, fd: FormData): Promise<FormActionState> {
  const courseId = value(fd, "courseId");
  if (!courseId) return { error: "No pudimos identificar el curso. Recargá la página e intentá nuevamente." };
  await teacherCourse(courseId);
  const title = value(fd, "title");
  if (title.length < 3) return { error: "Agregá un título claro para identificar este material." };
  const file = fd.get("file");
  const uploadedFile = file instanceof File && file.size > 0 ? file : null;
  const fileName = uploadedFile?.name ?? null;

  try {
    const recentDuplicate = await db.learningMaterial.findFirst({
      where: {
        courseId,
        title,
        createdAt: { gte: new Date(Date.now() - 15_000) },
        ...(fileName ? { versions: { some: { fileName } } } : {})
      },
      select: { id: true }
    });

    if (!recentDuplicate) {
      await createMaterial({
        courseId,
        title,
        state: value(fd, "state") === "DRAFT" ? "DRAFT" : "ACTIVE",
        text: value(fd, "text"),
        file: uploadedFile
      });
    }
  } catch (error) {
    console.error("No se pudo procesar el material.", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Formato no soportado")) return { error: "Ese formato no es compatible. Usá PDF, TXT o Markdown." };
    if (message.includes("Agregá texto o un archivo")) return { error: "Pegá contenido en texto o elegí un archivo para continuar." };
    if (message.includes("demasiado corto")) return { error: "El contenido es demasiado corto para usarlo como fuente del tutor." };
    return { error: "No pudimos procesar el material. Revisá el archivo o el texto e intentá nuevamente." };
  }

  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=content&notice=material-added`);
}

export async function setMaterialStateAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const materialId = required(fd, "materialId");
  const state = required(fd, "state");
  if (!["DRAFT", "ACTIVE", "RETIRED"].includes(state)) throw new Error("Estado inválido");
  const material = await withDbRetry(() => db.learningMaterial.findFirst({ where: { id: materialId, courseId } }));
  if (!material) throw new Error("Material no encontrado");
  const allowed = material.state === "DRAFT" ? ["DRAFT", "ACTIVE", "RETIRED"] : material.state === "ACTIVE" ? ["ACTIVE", "RETIRED"] : ["RETIRED", "ACTIVE"];
  if (!allowed.includes(state)) throw new Error(`Transición de material inválida: ${material.state} → ${state}`);
  await withDbRetry(() => db.learningMaterial.update({ where: { id: materialId }, data: { state: state as any } }));
  revalidatePath(`/teacher/courses/${courseId}`);
  const notice = state === "ACTIVE" ? "material-restored" : "material-retired";
  redirect(`/teacher/courses/${courseId}?view=content&notice=${notice}`);
}

export async function sendMessageAction(_previous: ChatActionState, fd: FormData): Promise<ChatActionState> {
  const activityId = value(fd, "activityId");
  const text = chatPipelineInput(fd.get("message"));
  if (!activityId) return { error: "No pudimos identificar la actividad. Volvé al curso e intentá nuevamente." };
  if (text.length < 2) return { error: "Escribí tu pregunta o idea antes de enviar." };

  const activity = await db.activity.findUnique({ where: { id: activityId }, include: { course: true } });
  if (!activity) return { error: "Esta actividad ya no está disponible." };
  const { user } = await studentEnrollment(activity.courseId);
  if (!hasAcceptedPrivacyContract(user.student)) {
    return { error: "Aceptá el aviso de privacidad vigente antes de iniciar o continuar una conversación." };
  }
  let conversation = await db.conversation.findFirst({ where: { activityId, studentId: user.student.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!conversation) {
    conversation = await db.conversation.create({ data: { courseId: activity.courseId, activityId, studentId: user.student.id, consentedAt: new Date() } });
  }

  const history = await db.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, select: { role: true, content: true } });

  let reply: Awaited<ReturnType<typeof tutorReply>>;
  try {
    reply = await tutorReply({ courseId: activity.courseId, courseName: activity.course.name, studentText: text, history: history.filter((m) => m.role === "STUDENT" || m.role === "ASSISTANT") as any });
  } catch (error) {
    console.error("No se pudo obtener respuesta del tutor.", error);
    return { error: "El tutor no pudo responder esta vez. Tu mensaje sigue escrito: podés intentarlo nuevamente." };
  }

  try {
    await db.$transaction([
      db.message.create({ data: { conversationId: conversation.id, role: "STUDENT", content: text } }),
      db.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply.content, sourceChunkIds: reply.sourceChunkIds } })
    ]);
  } catch (error) {
    console.error("No se pudo guardar la respuesta del tutor.", error);
    return { error: "Obtuvimos una respuesta, pero no pudimos guardarla de forma segura. Intentá enviar tu mensaje nuevamente." };
  }

  const conversationId = conversation.id;
  after(async () => {
    try {
      await analyzeConversation(conversationId);
    } catch (error) {
      console.error("No se pudo actualizar el análisis pedagógico después del mensaje.", error);
    }
  });

  revalidatePath(`/student/chat/${activityId}`);
  redirect(`/student/chat/${activityId}#latest-message`);
}

export async function acceptPrivacyContractAction(fd: FormData) {
  const activityId = required(fd, "activityId");
  const activity = await db.activity.findUnique({ where: { id: activityId }, select: { courseId: true } });
  if (!activity) throw new Error("Actividad no encontrada");
  const { user } = await studentEnrollment(activity.courseId);
  await db.studentProfile.update({
    where: { id: user.student.id },
    data: { privacyNoticeVersion: PRIVACY_CONTRACT.version, privacyNoticeAcceptedAt: new Date() }
  });
  revalidatePath(`/student/chat/${activityId}`);
  redirect(`/student/chat/${activityId}`);
}

export async function deleteConversationAction(fd: FormData) {
  const conversationId = required(fd, "conversationId");
  const user = await requireStudent();
  const conversation = await db.conversation.findFirst({ where: { id: conversationId, studentId: user.student.id } });
  if (!conversation) throw new Error("Conversación no encontrada");
  await db.conversation.delete({ where: { id: conversationId } });
  await refreshCourseInsights(conversation.courseId);
  revalidatePath(`/student/courses/${conversation.courseId}`);
  redirect(`/student/courses/${conversation.courseId}?notice=conversation-deleted`);
}

export async function createSessionAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const activityId = value(fd, "activityId") || null;
  if (activityId) {
    const activity = await db.activity.findFirst({ where: { id: activityId, courseId } });
    if (!activity) throw new Error("Actividad inválida");
  }
  await db.classSession.create({ data: { courseId, activityId, title: required(fd, "title", 3) } });
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=classes&notice=session-opened`);
}

export async function closeSessionAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const sessionId = required(fd, "sessionId");
  const session = await db.classSession.findFirst({ where: { id: sessionId, courseId } });
  if (!session) throw new Error("Sesión no encontrada");
  await db.classSession.update({ where: { id: sessionId }, data: { status: "CLOSED", endedAt: new Date() } });
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=classes&notice=session-closed`);
}

export async function updateRecommendationAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const recommendationId = required(fd, "recommendationId");
  const to = required(fd, "status");
  if (!["VIEWED", "APPLIED", "DISCARDED"].includes(to)) throw new Error("Estado inválido");
  const rec = await db.recommendation.findFirst({ where: { id: recommendationId, courseId } });
  if (!rec) throw new Error("Recomendación no encontrada");
  assertRecommendationTransition(rec.status, to);
  await db.recommendation.update({ where: { id: rec.id }, data: { status: to as any } });
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=insights&notice=recommendation-updated`);
}

export async function registerInterventionAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const recommendationId = required(fd, "recommendationId");
  const sessionId = required(fd, "sessionId");
  const rec = await db.recommendation.findFirst({ where: { id: recommendationId, courseId }, include: { insight: true } });
  const session = await db.classSession.findFirst({ where: { id: sessionId, courseId } });
  if (!rec || !session) throw new Error("Recomendación o sesión inválida");
  await db.$transaction([
    db.recommendation.update({ where: { id: rec.id }, data: { status: "APPLIED" } }),
    db.teacherIntervention.create({ data: { courseId, insightId: rec.insightId, recommendationId: rec.id, sessionId, actualAction: value(fd, "actualAction") || rec.actionText } })
  ]);
  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}?view=insights&notice=intervention-registered`);
}

export async function submitFeedbackAction(fd: FormData) {
  const sessionId = required(fd, "sessionId");
  const rating = Number(required(fd, "rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 4) throw new Error("Valoración inválida");
  const session = await db.classSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "CLOSED") throw new Error("La clase todavía no está disponible para feedback");
  const { user } = await studentEnrollment(session.courseId);
  await db.classFeedback.upsert({
    where: { sessionId_studentId: { sessionId, studentId: user.student.id } },
    update: { rating, comment: value(fd, "comment") || null },
    create: { courseId: session.courseId, sessionId, studentId: user.student.id, rating, comment: value(fd, "comment") || null }
  });
  await refreshClassFeedbackInsight(sessionId);
  revalidatePath(`/teacher/courses/${session.courseId}`);
  redirect(`/student/courses/${session.courseId}?notice=feedback-sent`);
}

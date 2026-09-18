"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/src/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword, requireStudent, requireTeacher } from "@/src/lib/auth";
import { createMaterial } from "@/src/lib/materials";
import { tutorReply } from "@/src/lib/tutor";
import { analyzeConversation, refreshCourseInsights } from "@/src/lib/analysis";
import { refreshClassFeedbackInsight } from "@/src/lib/feedback";
import { assertRecommendationTransition } from "@/src/lib/domain.mjs";

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
  const course = await db.course.findFirst({ where: { id: courseId, teacherId: user.teacher.id } });
  if (!course) throw new Error("Curso no encontrado o sin permiso");
  return { user, course };
}

async function studentEnrollment(courseId: string) {
  const user = await requireStudent();
  const enrollment = await db.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: user.student.id } } });
  if (!enrollment) throw new Error("No estás inscripto en este curso");
  return { user, enrollment };
}

export async function registerAction(fd: FormData) {
  const name = required(fd, "name", 2);
  const email = required(fd, "email", 5).toLowerCase();
  const password = required(fd, "password", 8);
  const role = safeRole(required(fd, "role"));
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) throw new Error("Ya existe una cuenta con ese email");
  const { hash, salt } = hashPassword(password);
  const user = await db.user.create({ data: {
    name, email, role, passwordHash: hash, passwordSalt: salt,
    teacher: role === "TEACHER" ? { create: {} } : undefined,
    student: role === "STUDENT" ? { create: {} } : undefined
  } });
  await createSession(user.id);
  redirect(role === "TEACHER" ? "/teacher" : "/student");
}

export async function loginAction(fd: FormData) {
  const email = required(fd, "email").toLowerCase();
  const password = required(fd, "password");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) throw new Error("Credenciales inválidas");
  await createSession(user.id);
  redirect(user.role === "TEACHER" ? "/teacher" : "/student");
}

export async function logoutAction() { await destroySession(); redirect("/login"); }

export async function createCourseAction(fd: FormData) {
  const user = await requireTeacher();
  const name = required(fd, "name", 3);
  const description = required(fd, "description", 10);
  let code = joinCode();
  while (await db.course.findUnique({ where: { joinCode: code } })) code = joinCode();
  const course = await db.course.create({ data: { teacherId: user.teacher.id, name, description, joinCode: code } });
  redirect(`/teacher/courses/${course.id}`);
}

export async function updateCourseAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  await db.course.update({ where: { id: courseId }, data: { name: required(fd, "name", 3), description: required(fd, "description", 10) } });
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function joinCourseAction(fd: FormData) {
  const user = await requireStudent();
  const code = required(fd, "joinCode").toUpperCase();
  const course = await db.course.findUnique({ where: { joinCode: code } });
  if (!course) throw new Error("Código de curso inválido");
  await db.enrollment.upsert({ where: { courseId_studentId: { courseId: course.id, studentId: user.student.id } }, update: {}, create: { courseId: course.id, studentId: user.student.id } });
  redirect(`/student/courses/${course.id}`);
}

export async function createActivityAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  await db.activity.create({ data: { courseId, title: required(fd, "title", 3), description: required(fd, "description", 5) } });
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function createMaterialAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const file = fd.get("file");
  await createMaterial({ courseId, title: required(fd, "title", 3), state: value(fd, "state") === "DRAFT" ? "DRAFT" : "ACTIVE", text: value(fd, "text"), file: file instanceof File ? file : null });
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function setMaterialStateAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const materialId = required(fd, "materialId");
  const state = required(fd, "state");
  if (!["DRAFT", "ACTIVE", "RETIRED"].includes(state)) throw new Error("Estado inválido");
  const material = await db.learningMaterial.findFirst({ where: { id: materialId, courseId } });
  if (!material) throw new Error("Material no encontrado");
  const allowed = material.state === "DRAFT" ? ["DRAFT", "ACTIVE", "RETIRED"] : material.state === "ACTIVE" ? ["ACTIVE", "RETIRED"] : ["RETIRED"];
  if (!allowed.includes(state)) throw new Error(`Transición de material inválida: ${material.state} → ${state}`);
  await db.learningMaterial.update({ where: { id: materialId }, data: { state: state as any } });
  revalidatePath(`/teacher/courses/${courseId}`);
}

export async function sendMessageAction(fd: FormData) {
  const activityId = required(fd, "activityId");
  const text = required(fd, "message", 2);
  const activity = await db.activity.findUnique({ where: { id: activityId }, include: { course: true } });
  if (!activity) throw new Error("Actividad no encontrada");
  const { user } = await studentEnrollment(activity.courseId);
  let conversation = await db.conversation.findFirst({ where: { activityId, studentId: user.student.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!conversation) {
    if (value(fd, "consent") !== "yes") throw new Error("Necesitamos tu consentimiento para procesar esta conversación de forma agregada.");
    conversation = await db.conversation.create({ data: { courseId: activity.courseId, activityId, studentId: user.student.id, consentedAt: new Date() } });
  }
  const history = await db.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, select: { role: true, content: true } });
  await db.message.create({ data: { conversationId: conversation.id, role: "STUDENT", content: text } });
  const reply = await tutorReply({ courseId: activity.courseId, courseName: activity.course.name, studentText: text, history: history.filter((m) => m.role === "STUDENT" || m.role === "ASSISTANT") as any });
  await db.message.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: reply.content, sourceChunkIds: reply.sourceChunkIds } });
  await analyzeConversation(conversation.id);
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
}

export async function closeSessionAction(fd: FormData) {
  const courseId = required(fd, "courseId");
  await teacherCourse(courseId);
  const sessionId = required(fd, "sessionId");
  const session = await db.classSession.findFirst({ where: { id: sessionId, courseId } });
  if (!session) throw new Error("Sesión no encontrada");
  await db.classSession.update({ where: { id: sessionId }, data: { status: "CLOSED", endedAt: new Date() } });
  revalidatePath(`/teacher/courses/${courseId}`);
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
  redirect(`/student/courses/${session.courseId}`);
}

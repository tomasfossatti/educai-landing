import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { aggregateConceptSignals } from "../src/lib/domain.mjs";
import { deleteConversationAndRefresh } from "../src/lib/conversation-deletion.mjs";

const baseUrl = process.env.TEST_DATABASE_URL;
const schema = `educai_test_${crypto.randomBytes(6).toString("hex")}`;
let db;
let isolatedUrl;

function databaseUrlWithSchema(url, schemaName) {
  const parsed = new URL(url);
  parsed.searchParams.set("schema", schemaName);
  return parsed.toString();
}

before(async () => {
  if (!baseUrl) return;
  isolatedUrl = databaseUrlWithSchema(baseUrl, schema);
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: isolatedUrl }, stdio: "pipe"
  });
  db = new PrismaClient({ datasourceUrl: isolatedUrl });
  await db.$connect();
});

after(async () => {
  if (!db) return;
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
});

async function fixture() {
  const fixtureId = crypto.randomBytes(5).toString("hex");
  const teacher = await db.user.create({ data: { email: `${schema}-${fixtureId}@teacher.test`, name: "Teacher", role: "TEACHER", passwordHash: "x", passwordSalt: "x", teacher: { create: {} } }, include: { teacher: true } });
  const course = await db.course.create({ data: { teacherId: teacher.teacher.id, name: "Course", description: "Integration fixture", joinCode: fixtureId.toUpperCase() } });
  const concept = await db.concept.create({ data: { courseId: course.id, name: "Causalidad", slug: "causalidad" } });
  const students = [];
  for (let index = 0; index < 3; index++) {
    const user = await db.user.create({ data: { email: `${schema}-${fixtureId}-${index}@student.test`, name: `Student ${index}`, role: "STUDENT", passwordHash: "x", passwordSalt: "x", student: { create: {} } }, include: { student: true } });
    await db.enrollment.create({ data: { courseId: course.id, studentId: user.student.id } });
    const conversation = await db.conversation.create({ data: { courseId: course.id, studentId: user.student.id, consentedAt: new Date(), messages: { create: { role: "STUDENT", content: `private-${index}` } }, analyses: { create: { participantKey: `participant-${index}`, modelProvider: "test", modelName: "test", signals: { create: { conceptId: concept.id, participantKey: `participant-${index}`, type: "CONFUSION", evidenceSnippet: `evidence-${index}` } } } } } });
    students.push({ user, conversation });
  }
  await recalculate(course.id);
  return { course, concept, students };
}

async function recalculate(courseId) {
  const signals = await db.conceptSignal.findMany({ where: { concept: { courseId } }, select: { conceptId: true, participantKey: true, evidenceSnippet: true, explanationType: true, understandingSignal: true } });
  const participantRows = await db.conversationAnalysis.findMany({ where: { conversation: { courseId } }, distinct: ["participantKey"], select: { participantKey: true } });
  const aggregates = aggregateConceptSignals(signals, participantRows.length, 3);
  const active = new Set(aggregates.map((item) => item.conceptKey));
  const existing = await db.aggregatedInsight.findMany({ where: { courseId } });
  for (const insight of existing.filter((item) => !active.has(item.conceptId))) await db.aggregatedInsight.update({ where: { id: insight.id }, data: { affectedParticipants: 0, totalParticipants: participantRows.length, proportion: 0, evidenceState: "NO_DATA", summary: "Sin datos", evidenceJson: [], explanationJson: [] } });
  for (const aggregate of aggregates) await db.aggregatedInsight.upsert({ where: { courseId_conceptId: { courseId, conceptId: aggregate.conceptKey } }, create: { courseId, conceptId: aggregate.conceptKey, affectedParticipants: aggregate.affectedParticipants, totalParticipants: aggregate.totalParticipants, proportion: aggregate.proportion, evidenceState: aggregate.evidenceState, summary: "Agregado", evidenceJson: aggregate.evidence, explanationJson: aggregate.explanations }, update: { affectedParticipants: aggregate.affectedParticipants, totalParticipants: aggregate.totalParticipants, proportion: aggregate.proportion, evidenceState: aggregate.evidenceState, evidenceJson: aggregate.evidence, explanationJson: aggregate.explanations } });
}

test("isolated migration preserves cascades and deletion recalculates evidence", { skip: !baseUrl && "set TEST_DATABASE_URL to run PostgreSQL integration tests" }, async () => {
  const { course, concept, students } = await fixture();
  const beforeInsight = await db.aggregatedInsight.findUnique({ where: { courseId_conceptId: { courseId: course.id, conceptId: concept.id } } });
  assert.equal(beforeInsight.evidenceState, "SUFFICIENT");
  assert.deepEqual(beforeInsight.evidenceJson.sort(), ["evidence-0", "evidence-1", "evidence-2"]);

  const deleted = students[0];
  const analysis = await db.conversationAnalysis.findFirst({ where: { conversationId: deleted.conversation.id } });
  const message = await db.message.findFirst({ where: { conversationId: deleted.conversation.id } });
  const signal = await db.conceptSignal.findFirst({ where: { analysisId: analysis.id } });
  await deleteConversationAndRefresh({ db, conversationId: deleted.conversation.id, studentId: deleted.user.student.id, refreshCourseInsights: recalculate });

  assert.equal(await db.message.count({ where: { id: message.id } }), 0);
  assert.equal(await db.conversationAnalysis.count({ where: { id: analysis.id } }), 0);
  assert.equal(await db.conceptSignal.count({ where: { id: signal.id } }), 0);
  const afterInsight = await db.aggregatedInsight.findUnique({ where: { courseId_conceptId: { courseId: course.id, conceptId: concept.id } } });
  assert.equal(afterInsight.affectedParticipants, 2);
  assert.equal(afterInsight.evidenceState, "INSUFFICIENT");
  assert.doesNotMatch(JSON.stringify(afterInsight.evidenceJson), /evidence-0/);
});

test("conversation deletion is authorized to its owner", { skip: !baseUrl && "set TEST_DATABASE_URL to run PostgreSQL integration tests" }, async () => {
  const { students } = await fixture();
  await assert.rejects(() => deleteConversationAndRefresh({ db, conversationId: students[0].conversation.id, studentId: students[1].user.student.id, refreshCourseInsights: recalculate }), /no encontrada/i);
  assert.equal(await db.conversation.count({ where: { id: students[0].conversation.id } }), 1);
});

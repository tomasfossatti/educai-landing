import test from "node:test";
import assert from "node:assert/strict";
import { assertTeacherDtoPrivacy, teacherInsightDto } from "../src/lib/teacher-privacy.mjs";

test("teacher insight DTO contains aggregate evidence and strips its source identity", () => {
  const dto = teacherInsightDto({ id: "i1", concept: { name: "Causalidad" }, affectedParticipants: 3, totalParticipants: 8, evidenceState: "SUFFICIENT", summary: "Aparecen señales agregadas", evidence: ["No distingo ambos conceptos"], studentId: "s1", participantKey: "secret", conversation: { id: "c1" } });
  assert.deepEqual(Object.keys(dto).sort(), ["affectedParticipants", "concept", "evidence", "evidenceState", "id", "summary", "totalParticipants"]);
  const rendered = JSON.stringify(dto);
  assert.doesNotMatch(rendered, /studentId|participantKey|ana@uni\.edu|Ana Pérez|conversation/i);
});

test("privacy guard fails closed on identity or identifiable conversation fields at any depth", () => {
  for (const forbidden of [
    { studentId: "s1" }, { email: "ana@uni.edu" }, { name: "Ana Pérez" },
    { participantKey: "pk" }, { conversation: { id: "c1", content: "texto privado" } },
    { nested: [{ conversations: [{ id: "c1" }] }] }
  ]) assert.throws(() => assertTeacherDtoPrivacy(forbidden), /forbidden field/);
});

test("insufficient teacher DTO never renders snippets", () => {
  const dto = teacherInsightDto({ id: "i2", conceptLabel: "Sesgo", affectedParticipants: 1, totalParticipants: 4, evidenceState: "INSUFFICIENT", summary: "Datos insuficientes", evidence: ["identifiable private text"] });
  assert.deepEqual(dto.evidence, []);
});

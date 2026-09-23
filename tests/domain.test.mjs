import test from "node:test";
import assert from "node:assert/strict";
import {
  evidenceState, aggregateConceptSignals, anonymizeSnippet, canTransitionRecommendation,
  canTransitionIntervention, comparisonWindows, conceptTrend, mergeConceptSignals,
  prePostDescriptor, resolveConceptAliases, splitConceptSignals, validateClassFeedbackAssociation
} from "../src/lib/domain.mjs";
import { assertRole, canTeacherAccessCourse, canStudentAccessCourse } from "../src/lib/authorization.mjs";
import { validateAnalysisPayload } from "../src/lib/analysis-schema.mjs";

test("evidence threshold preserves NO_DATA and counts participants, not message volume", () => {
  assert.equal(evidenceState(0, 3), "NO_DATA");
  assert.equal(evidenceState(2, 3), "INSUFFICIENT");
  assert.equal(evidenceState(3, 3), "SUFFICIENT");
  const [result] = aggregateConceptSignals([
    { conceptId: "c1", participantKey: "p1", evidenceSnippet: "duda 1" },
    { conceptId: "c1", participantKey: "p1", evidenceSnippet: "duda 2" },
    { conceptId: "c1", participantKey: "p2", evidenceSnippet: "duda 3" },
    { conceptId: "c1", participantKey: "p3", evidenceSnippet: "duda 4" }
  ], 5, 3);
  assert.deepEqual({ count: result.affectedParticipants, state: result.evidenceState, proportion: result.proportion }, { count: 3, state: "SUFFICIENT", proportion: .6 });
});

test("aliases converge before aggregation without double-counting a participant", () => {
  const resolved = resolveConceptAliases([
    { conceptId: "alias-a", participantKey: "p1" },
    { conceptId: "canonical", participantKey: "p1" },
    { conceptId: "alias-b", participantKey: "p2" }
  ], { "alias-a": "canonical", "alias-b": "canonical" });
  const [aggregate] = aggregateConceptSignals(resolved, 2, 2);
  assert.equal(aggregate.affectedParticipants, 2);
  assert.equal(aggregate.evidenceState, "SUFFICIENT");
});

test("concept merge and selective split preserve signal provenance", () => {
  const original = [{ id: "s1", conceptId: "a" }, { id: "s2", conceptId: "b" }, { id: "s3", conceptId: "b" }];
  const merged = mergeConceptSignals(original, ["b"], "a");
  assert.deepEqual(merged.map((s) => s.conceptId), ["a", "a", "a"]);
  const split = splitConceptSignals(merged, "a", "new-b", ["s2"]);
  assert.deepEqual(split.map((s) => s.conceptId), ["a", "new-b", "a"]);
  assert.deepEqual(original.map((s) => s.conceptId), ["a", "b", "b"]);
});

test("trend rules include NEW, RISING, STABLE, FALLING and NO_DATA", () => {
  assert.equal(conceptTrend(0, 0), "NO_DATA");
  assert.equal(conceptTrend(1, 3), "NEW");
  assert.equal(conceptTrend(3, 5), "RISING");
  assert.equal(conceptTrend(3, 4), "STABLE");
  assert.equal(conceptTrend(5, 2), "FALLING");
});

test("intervention lifecycle only advances from planned to a terminal outcome", () => {
  assert.equal(canTransitionIntervention("PLANNED", "APPLIED"), true);
  assert.equal(canTransitionIntervention("PLANNED", "SKIPPED"), true);
  assert.equal(canTransitionIntervention("APPLIED", "PLANNED"), false);
  assert.equal(canTransitionIntervention("SKIPPED", "APPLIED"), false);
});

test("comparison windows use intervention application as an explicit boundary", () => {
  const events = [{ id: "old", at: "2026-01-01T09:00:00Z" }, { id: "edge", at: "2026-01-02T09:00:00Z" }, { id: "new", at: "2026-01-03T09:00:00Z" }];
  const windows = comparisonWindows(events, "2026-01-02T09:00:00Z");
  assert.deepEqual(windows.before.map((e) => e.id), ["old"]);
  assert.deepEqual(windows.after.map((e) => e.id), ["edge", "new"]);
});

test("anonymization removes obvious email, phone and identifiers", () => {
  const out = anonymizeSnippet("Escribime a ana@uni.edu, +54 351 555 7788. Legajo: ABCD-1234");
  assert.match(out, /\[email\]/); assert.match(out, /\[teléfono\]/); assert.match(out, /\[identificador\]/);
  assert.doesNotMatch(out, /ana@uni\.edu/);
});

test("recommendation state machine blocks reopening terminal states", () => {
  assert.equal(canTransitionRecommendation("GENERATED", "VIEWED"), true);
  assert.equal(canTransitionRecommendation("VIEWED", "APPLIED"), true);
  assert.equal(canTransitionRecommendation("APPLIED", "VIEWED"), false);
  assert.equal(canTransitionRecommendation("DISCARDED", "APPLIED"), false);
});

test("role and course-scope helpers isolate teacher and student access", () => {
  const teacher = { role: "TEACHER", teacher: { id: "t1" } };
  const student = { role: "STUDENT", student: { id: "s1" } };
  assert.equal(canTeacherAccessCourse(teacher, { teacherId: "t1" }), true);
  assert.equal(canTeacherAccessCourse(teacher, { teacherId: "t2" }), false);
  assert.equal(canStudentAccessCourse(student, { studentId: "s1" }), true);
  assert.equal(canStudentAccessCourse(student, { studentId: "s2" }), false);
  assert.throws(() => assertRole(student, "TEACHER"));
});

test("structured analysis validator accepts valid payload and rejects free-form data", () => {
  const valid = { concepts: [{ concept: "correlación y causalidad", signals: [{ type: "CONFUSION", evidence_message_id: "m1", evidence_snippet: "No entiendo la diferencia" }], explanation_patterns: [{ type: "CONCRETE_EXAMPLE", observed_signal: "EXPLICIT_CONFIRMATION", evidence_message_id: "m2" }] }] };
  assert.equal(validateAnalysisPayload(valid).concepts[0].signals[0].type, "CONFUSION");
  assert.throws(() => validateAnalysisPayload({ concepts: [{ concept: "x", signals: [{ type: "DIAGNOSIS" }], explanation_patterns: [] }] }));
});

test("pre/post comparison explicitly refuses causal interpretation", () => {
  const result = prePostDescriptor({ beforeAffected: 4, beforeTotal: 5, afterDoubt: 1, afterTotal: 4 });
  assert.equal(result.before.rate, .8); assert.equal(result.after.rate, .25); assert.equal(result.comparableAsCausalEffect, false);
  assert.match(result.limitation, /no demuestra causalidad/i);
});

test("ClassFeedback validates its real session and enrollment associations", () => {
  assert.equal(validateClassFeedbackAssociation({ feedbackCourseId: "course-a", sessionCourseId: "course-a", feedbackStudentId: "s1", enrolledStudentIds: ["s1"] }), true);
  assert.throws(() => validateClassFeedbackAssociation({ feedbackCourseId: "course-a", sessionCourseId: "course-b", feedbackStudentId: "s1", enrolledStudentIds: ["s1"] }));
  assert.throws(() => validateClassFeedbackAssociation({ feedbackCourseId: "course-a", sessionCourseId: "course-a", feedbackStudentId: "s2", enrolledStudentIds: ["s1"] }));
});

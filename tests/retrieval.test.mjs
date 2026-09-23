import test from "node:test";
import assert from "node:assert/strict";
import { eligibleChunks, lexicalCandidates, lexicalFallback, provenanceForMessage } from "../src/lib/retrieval-domain.mjs";

const chunks = [
  { id: "active", courseId: "course-a", text: "correlación no implica causalidad", material: { state: "ACTIVE" } },
  { id: "draft", courseId: "course-a", text: "correlación causalidad", material: { state: "DRAFT" } },
  { id: "retired", courseId: "course-a", text: "correlación causalidad", material: { state: "RETIRED" } },
  { id: "foreign", courseId: "course-b", text: "correlación causalidad", material: { state: "ACTIVE" } }
];

test("retrieval filters non-active and cross-course materials", () => {
  assert.deepEqual(eligibleChunks(chunks, "course-a").map((chunk) => chunk.id), ["active"]);
  assert.deepEqual(lexicalCandidates(chunks, "course-a", "causalidad").map((chunk) => chunk.id), ["active"]);
});

test("lexical fallback remains available and provenance retains method, score and rank", () => {
  const lexical = lexicalCandidates(chunks, "course-a", "causalidad");
  assert.deepEqual(lexicalFallback(lexical, []).map((chunk) => chunk.id), ["active"]);
  assert.deepEqual(provenanceForMessage("message-1", lexical), [{ messageId: "message-1", contentChunkId: "active", retrievalMethod: "LEXICAL", retrievalScore: 1, rank: 1 }]);
});

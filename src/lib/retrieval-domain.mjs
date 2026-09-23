function normalizeText(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lexicalScore(query, text) {
  const terms = [...new Set(normalizeText(query).split(" ").filter((term) => term.length > 2))];
  const haystack = normalizeText(text);
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function eligibleChunks(chunks, courseId) {
  return chunks.filter((chunk) => chunk.courseId === courseId && chunk.material?.state === "ACTIVE");
}

export function lexicalCandidates(chunks, courseId, query, limit = 5) {
  return eligibleChunks(chunks, courseId)
    .map((chunk) => ({ ...chunk, score: lexicalScore(query, chunk.text), retrievalMethod: "LEXICAL" }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function provenanceForMessage(messageId, candidates) {
  return candidates.map((candidate, index) => ({
    messageId,
    contentChunkId: candidate.id,
    retrievalMethod: candidate.retrievalMethod ?? "LEXICAL",
    retrievalScore: candidate.score,
    rank: index + 1
  }));
}

export function lexicalFallback(lexical, semantic, limit = 5) {
  const semanticAvailable = Array.isArray(semantic) && semantic.length > 0;
  return (semanticAvailable ? [...semantic, ...lexical] : lexical)
    .filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index)
    .slice(0, limit);
}

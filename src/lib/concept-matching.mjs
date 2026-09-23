export function normalizeConceptLabel(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function bigrams(value) {
  const padded = ` ${normalizeConceptLabel(value)} `;
  return new Set(Array.from({ length: Math.max(0, padded.length - 1) }, (_, i) => padded.slice(i, i + 2)));
}

export function conceptSimilarity(left, right) {
  const a = normalizeConceptLabel(left);
  const b = normalizeConceptLabel(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aa = bigrams(a);
  const bb = bigrams(b);
  let overlap = 0;
  for (const item of aa) if (bb.has(item)) overlap += 1;
  return (2 * overlap) / (aa.size + bb.size);
}

export function distinctParticipants(signals) {
  return new Set(signals.map((signal) => signal.participantKey)).size;
}

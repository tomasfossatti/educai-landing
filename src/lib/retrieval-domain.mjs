export const RETRIEVABLE_MATERIAL_STATE = "ACTIVE";

export function isRetrievableMaterialState(state) {
  return state === RETRIEVABLE_MATERIAL_STATE;
}

/** Reciprocal-rank fusion keeps either retrieval path useful without comparing unlike raw scores. */
export function rankHybridCandidates(lexical, semantic, limit = 5, rankConstant = 60) {
  const candidates = new Map();
  const add = (items, channel) => items.forEach((item, index) => {
    const current = candidates.get(item.id) ?? { ...item, channels: new Set(), score: 0 };
    current.channels.add(channel);
    current.score += 1 / (rankConstant + index + 1);
    candidates.set(item.id, current);
  });
  add(lexical, "LEXICAL");
  add(semantic, "SEMANTIC");
  return [...candidates.values()]
    .sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
    .slice(0, limit)
    .map((candidate, index) => ({
      id: candidate.id,
      text: candidate.text,
      position: candidate.position,
      material: candidate.material,
      score: candidate.score,
      retrievalMethod: candidate.channels.size === 2 ? "HYBRID" : [...candidate.channels][0],
      rank: index + 1
    }));
}

export function readableSource(materialTitle, position) {
  return `${materialTitle} · Fragmento ${position + 1}`;
}

export function messageSourceRows(messageId, sources) {
  return sources.map((source) => ({
    messageId,
    contentChunkId: source.id,
    retrievalMethod: source.retrievalMethod,
    retrievalScore: source.score,
    rank: source.rank
  }));
}

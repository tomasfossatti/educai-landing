export function normalizeText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñáéíóúü\s]/gi, " ").replace(/\s+/g, " ").trim();
}

export function slugify(text: string) {
  return normalizeText(text).replace(/\s+/g, "-").slice(0, 120) || "concepto";
}

export function chunkText(text: string, maxChars = 1400, overlap = 180) {
  const cleaned = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(cleaned.length, start + maxChars);
    if (end < cleaned.length) {
      const paragraph = cleaned.lastIndexOf("\n\n", end);
      const sentence = cleaned.lastIndexOf(". ", end);
      const candidate = Math.max(paragraph, sentence);
      if (candidate > start + maxChars * 0.55) end = candidate + (candidate === sentence ? 2 : 0);
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function lexicalScore(query: string, text: string) {
  const terms = [...new Set(normalizeText(query).split(" ").filter((t) => t.length > 2))];
  if (!terms.length) return 0;
  const haystack = ` ${normalizeText(text)} `;
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(` ${term} `)) score += 2;
    else if (haystack.includes(term)) score += 0.5;
  }
  return score / terms.length;
}

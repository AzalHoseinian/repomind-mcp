const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "any", "can", "had", "her", "was", "one",
  "our", "out", "has", "have", "this", "that", "with", "from", "they", "will", "would", "there",
  "their", "what", "when", "which", "while", "into", "than", "then", "them", "these", "those",
  "been", "being", "does", "should", "could", "also", "just", "about", "after", "before",
]);

/** Lowercase word tokens, minus stopwords and tokens shorter than 3 chars. */
export function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return new Set(tokens.filter((t) => t.length >= 3 && !STOPWORDS.has(t)));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

export function shared(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((t) => b.has(t)).sort();
}

export const TITLE_WEIGHT = 2;

/**
 * Weighted mix of title similarity (weight 2) and body similarity (weight 1).
 * If the draft has no body, only the title counts, so a short draft is not penalised.
 */
export function score(
  draft: { title: Set<string>; body: Set<string> },
  other: { title: Set<string>; body: Set<string> },
): number {
  const t = jaccard(draft.title, other.title);
  if (draft.body.size === 0) return t;
  const b = jaccard(draft.body, other.body);
  return (TITLE_WEIGHT * t + b) / (TITLE_WEIGHT + 1);
}

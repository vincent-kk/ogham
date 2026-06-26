/**
 * Normalize a title for use as a tertiary dedup key: NFKD-fold, lowercase, and
 * strip everything but [a-z0-9]. Collapses case/whitespace/punctuation/diacritic
 * variants of the same title to one key.
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function joinKeywords(raw: string, fallback = '(none)'): string {
  const trimmed = raw.trim();
  return trimmed === '' ? fallback : trimmed;
}

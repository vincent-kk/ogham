export function joinKeywords(raw: string): string {
  const trimmed = raw.trim();
  return trimmed === '' ? '(none)' : trimmed;
}

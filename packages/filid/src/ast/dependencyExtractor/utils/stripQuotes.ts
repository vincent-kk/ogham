export function stripQuotes(s: string): string {
  return s.replace(/^['"]|['"]$/g, '');
}

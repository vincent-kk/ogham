export function normalizeEol(s: string): string {
  return s.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}

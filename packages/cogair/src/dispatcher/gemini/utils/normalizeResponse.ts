export function normalizeResponse(stdout: string): string | null {
  const trimmed = stdout.replace(/\n+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

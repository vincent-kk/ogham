export function getParentSegments(filePath: string): string[] {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter((p) => p.length > 0);
  return parts.slice(0, -1);
}

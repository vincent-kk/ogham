export function pathDepth(p: string): number {
  return p.split('/').filter((s) => s.length > 0).length;
}

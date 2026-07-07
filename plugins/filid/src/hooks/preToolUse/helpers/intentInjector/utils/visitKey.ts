/**
 * Composite fractal-map key: `{boundaryAbsPath}\t{relDir}`.
 *
 * relDir alone is ambiguous across monorepo packages — `plugins/a/src` and
 * `plugins/b/src` both reduce to `src` — so visit dedup must key on the
 * boundary as well.
 */
export function visitKey(boundary: string, relDir: string): string {
  return `${boundary}\t${relDir}`;
}

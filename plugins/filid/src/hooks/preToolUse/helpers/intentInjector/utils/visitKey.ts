/**
 * Composite fractal-map key: `{boundaryAbsPath}\t{relDir}`.
 *
 * relDir alone collides across monorepo packages (both `plugins/a/src` and
 * `plugins/b/src` reduce to `src`), which silently suppressed first-visit
 * INTENT.md injection for every package after the first.
 */
export function visitKey(boundary: string, relDir: string): string {
  return `${boundary}\t${relDir}`;
}

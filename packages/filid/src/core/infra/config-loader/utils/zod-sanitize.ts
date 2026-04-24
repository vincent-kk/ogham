/**
 * @file zod-sanitize.ts
 * @description Strict-sanitize fallback for `FilidConfigSchema.safeParse`
 * failures. Walks each `ZodIssue`, drops the offending key (for
 * `unrecognized_keys`) or the offending leaf value (for everything else),
 * and returns the sanitised object alongside the messages describing what
 * was changed. Pass the result back through the schema to get a typed
 * config — pass-through of unknown values is forbidden.
 *
 * The `addWarning` callback is the loader's single warn sink (push into
 * the returned `warnings[]` + emit via `log.warn`); this util never
 * touches the logger itself, preserving organ purity.
 */
import type { z } from 'zod';

type PathSegment = string | number;

/**
 * Render a `ZodIssue.path` array into a dotted/indexed string such as
 * `rules["zero-peer-file"].exempt[0]`. Exposed because the loader and
 * `validateConfigPatch` both format issue paths for user-facing error
 * messages.
 */
export function formatIssuePath(path: ReadonlyArray<PathSegment>): string {
  if (path.length === 0) return '<root>';
  return path
    .map((seg, idx) =>
      typeof seg === 'number' ? `[${seg}]` : idx === 0 ? seg : `.${seg}`,
    )
    .join('');
}

function getAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}

function deleteAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): void {
  if (path.length === 0) return;
  const parent = getAt(root, path.slice(0, -1));
  const leaf = path[path.length - 1];
  if (parent === null || parent === undefined || leaf === undefined) return;
  if (Array.isArray(parent) && typeof leaf === 'number') {
    parent.splice(leaf, 1);
    return;
  }
  if (typeof parent === 'object' && typeof leaf === 'string') {
    delete (parent as Record<string, unknown>)[leaf];
  }
}

/**
 * Strict-sanitize a parsed config against a `ZodError`.
 *
 * Returns `{ sanitized }` — a deep clone with unknown keys physically
 * removed (not pass-through). Each dropped value is announced via
 * `addWarning` in the order the issues surface.
 */
export function parseWithAllowlistWarn(
  parsed: unknown,
  error: z.ZodError,
  addWarning: (msg: string) => void,
): { sanitized: unknown } {
  const root: unknown =
    typeof structuredClone === 'function'
      ? structuredClone(parsed)
      : (JSON.parse(JSON.stringify(parsed)) as unknown);

  for (const issue of error.issues) {
    const pathStr = formatIssuePath(issue.path);
    if (issue.code === 'unrecognized_keys') {
      const parent = getAt(root, issue.path);
      if (
        parent === null ||
        parent === undefined ||
        typeof parent !== 'object' ||
        Array.isArray(parent)
      ) {
        addWarning(
          `config validation failed at ${pathStr}: ${issue.message} (ignored, non-fatal; see migration guide)`,
        );
        continue;
      }
      for (const key of issue.keys) {
        addWarning(
          `unknown key in ${pathStr}: "${key}" (dropped, non-fatal; see migration guide)`,
        );
        delete (parent as Record<string, unknown>)[key];
      }
      continue;
    }
    if (issue.path.length === 0) {
      addWarning(
        `config validation failed: ${issue.message} (ignored, non-fatal; see migration guide)`,
      );
      continue;
    }
    addWarning(
      `invalid value at ${pathStr}: ${issue.message} (dropped, non-fatal; see migration guide)`,
    );
    deleteAt(root, issue.path);
  }

  return { sanitized: root };
}

import type { z } from 'zod';

import { deleteAt } from './delete-at.js';
import { formatIssuePath } from './format-issue-path.js';
import { getAt } from './get-at.js';

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

import type { z } from 'zod';

import { deleteAt } from './deleteAt.js';
import { formatIssuePath } from './formatIssuePath.js';
import { getAt } from './getAt.js';
import { isCommentConfigKey } from './isCommentConfigKey.js';

/**
 * Strict-sanitize a parsed config against a `ZodError`.
 *
 * Returns `{ sanitized }` — a deep clone with unknown keys physically
 * removed (not pass-through). Each dropped value is announced via
 * `addWarning` with its config path, in the order the issues surface; an
 * issue that cannot be pinned to an entry is announced with a `null` path.
 * An unknown annotation key (`$schema`, `$comment`, `_`-prefixed) is dropped
 * silently; an invalid value is always announced, since a record key such as
 * an `entryPointOverrides` path may legitimately start with `_`.
 */
export function parseWithAllowlistWarn(
  parsed: unknown,
  error: z.ZodError,
  addWarning: (msg: string, key: readonly (string | number)[] | null) => void,
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
          issue.path,
        );
        continue;
      }
      for (const key of issue.keys) {
        if (!isCommentConfigKey(key))
          addWarning(
            `unknown key in ${pathStr}: "${key}" (dropped, non-fatal; see migration guide)`,
            [...issue.path, key],
          );
        delete (parent as Record<string, unknown>)[key];
      }
      continue;
    }
    if (issue.path.length === 0) {
      addWarning(
        `config validation failed: ${issue.message} (ignored, non-fatal; see migration guide)`,
        null,
      );
      continue;
    }
    addWarning(
      `invalid value at ${pathStr}: ${issue.message} (dropped, non-fatal; see migration guide)`,
      issue.path,
    );
    deleteAt(root, issue.path);
  }

  return { sanitized: root };
}

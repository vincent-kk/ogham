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
  const droppedPaths: Array<readonly (string | number)[]> = [];

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
    droppedPaths.push(issue.path);
  }

  droppedPaths.sort((left, right) => {
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      const a = left[index];
      const b = right[index];
      if (a === b) continue;
      if (typeof a === 'number' && typeof b === 'number') return b - a;
      return String(b).localeCompare(String(a));
    }
    return right.length - left.length;
  });
  for (const path of droppedPaths) deleteAt(root, path);

  return { sanitized: root };
}

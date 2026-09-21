import { samePath } from '@ogham/cross-platform';

import type { PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

function isStrictlyWithin(parentPath: string, path: string): boolean {
  return !samePath(parentPath, path) && isAtOrWithin(parentPath, path);
}

/**
 * Whether move `a` must run before move `b`.
 *
 * `a` goes first when its source sits in `b`'s source (the inner unit leaves
 * before its directory moves; equal sources constrain both ways), when its
 * target sits in `b`'s source (it lands and rides along), when `b` lands
 * exactly on `a`'s source (`a` vacates it), or when its target holds `b`'s
 * target (the outer directory is created by moving, before anything lands in
 * it).
 * @param a - A planned move
 * @param b - Another planned move of the same plan
 * @returns True when running `b` first would change the final layout
 */
export function mustPrecede(a: PlannedMove, b: PlannedMove): boolean {
  return (
    isAtOrWithin(b.sourcePath, a.sourcePath) ||
    isStrictlyWithin(b.sourcePath, a.targetPath) ||
    samePath(b.targetPath, a.sourcePath) ||
    isStrictlyWithin(a.targetPath, b.targetPath)
  );
}

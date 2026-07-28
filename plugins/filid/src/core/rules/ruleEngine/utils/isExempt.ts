/**
 * @file isExempt.ts
 * @description Throw-safe glob matching for `RuleOverride.exempt` patterns
 * and the path-scoping portion of object-form `additional-allowed` entries.
 *
 * The glob parser lives in `src/lib/globToRegexp.ts` and is shared with
 * `configLoader/utils/exemptSanitize.ts` so both code paths use identical
 * syntax semantics.
 *
 * Exceptions raised by RegExp construction or RegExp.test are swallowed — the
 * function always returns a boolean, so callers can trust it without defensive
 * try/catch (AC10a).
 */
import { pathForCompare } from '@ogham/cross-platform/paths';

import { globToRegExp } from '../../../../lib/globToRegexp.js';
import { isDynamicGlob } from '../../../../lib/isDynamicGlob.js';
import type { FractalNode } from '../../../../types/fractal.js';

/**
 * Does `target.path` match ANY of the supplied glob patterns?
 *
 * @returns `true` if at least one pattern matches. `false` for
 *   undefined / empty patterns, for invalid glob syntax, and for any runtime
 *   exception — never throws.
 */
export function isExempt(
  target: FractalNode | { path: string },
  patterns: string[] | undefined,
): boolean {
  if (!patterns || patterns.length === 0) return false;
  const targetPath = pathForCompare(target.path);
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.length === 0) continue;
    const comparablePattern = pathForCompare(pattern);
    if (!isDynamicGlob(comparablePattern)) {
      if (targetPath === comparablePattern) return true;
      continue;
    }
    try {
      const re = globToRegExp(comparablePattern);
      if (re.test(targetPath)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

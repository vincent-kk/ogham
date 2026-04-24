/**
 * @file is-exempt.ts
 * @description Throw-safe glob matching for `RuleOverride.exempt` patterns
 * and the path-scoping portion of object-form `additional-allowed` entries.
 *
 * The glob parser lives in `src/lib/glob-to-regexp.ts` and is shared with
 * `config-loader/utils/exempt-sanitize.ts` so both code paths use identical
 * syntax semantics.
 *
 * Exceptions raised by fast-glob.isDynamicPattern, RegExp construction, or
 * RegExp.test are swallowed — the function always returns a boolean, so
 * callers can trust it without defensive try/catch (AC10a).
 */
import fg from 'fast-glob';

import { globToRegExp } from '../../../../lib/glob-to-regexp.js';
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
  const targetPath = target.path;
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.length === 0) continue;
    try {
      if (!fg.isDynamicPattern(pattern)) {
        if (targetPath === pattern) return true;
        continue;
      }
    } catch {
      continue;
    }
    try {
      const re = globToRegExp(pattern);
      if (re.test(targetPath)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

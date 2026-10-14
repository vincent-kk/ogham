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
import type { FractalNode } from '../../../../types/fractal.js';

import { matchExempt } from './matchExempt.js';

/**
 * Does `target.path` match ANY of the supplied glob patterns?
 *
 * @param target Node or path-bearing target to match.
 * @param patterns Config literal paths and glob patterns.
 * @returns `true` if at least one pattern matches. `false` for
 *   undefined / empty patterns, for invalid glob syntax, and for any runtime
 *   exception — never throws.
 */
export function isExempt(
  target: FractalNode | { path: string },
  patterns: string[] | undefined,
): boolean {
  return matchExempt(target, patterns) !== null;
}

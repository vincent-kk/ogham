/**
 * @file is-exempt.ts
 * @description Throw-safe glob matching for `RuleOverride.exempt` patterns
 * and the path-scoping portion of object-form `additional-allowed` entries.
 *
 * Supports minimal picomatch-style glob syntax (`**`, `*`, `?`) and literal
 * path matching. Advanced globs (brace sets, negation, character classes)
 * beyond escape-safety are not supported — the exempt use case is simple
 * path prefixes.
 *
 * Exceptions raised by fast-glob.isDynamicPattern, RegExp construction, or
 * RegExp.test are swallowed — the function always returns a boolean, so
 * callers can trust it without defensive try/catch. This defeats the
 * rule-engine evaluateRule silent-swallow edge (AC10a).
 */
import fg from 'fast-glob';

import type { FractalNode } from '../../../../types/fractal.js';

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

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
  try {
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
  } catch {
    return false;
  }
  return false;
}

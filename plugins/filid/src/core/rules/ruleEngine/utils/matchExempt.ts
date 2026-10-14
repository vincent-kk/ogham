import { pathForCompare } from '@ogham/cross-platform';

import { globToRegExp } from '../../../../lib/globToRegexp.js';
import { isDynamicGlob } from '../../../../lib/isDynamicGlob.js';
import type { FractalNode } from '../../../../types/fractal.js';

/**
 * Finds a config exemption using portable path identity, exact matches first.
 * @param target Node or path-bearing target to match.
 * @param patterns Config literal paths and glob patterns.
 * @returns The original matching pattern, or null for no valid match.
 */
export function matchExempt(
  target: FractalNode | { path: string },
  patterns: string[] | undefined,
): string | null {
  if (!patterns || patterns.length === 0) return null;
  const targetPath = pathForCompare(target.path);
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.length === 0) continue;
    const comparablePattern = pathForCompare(pattern);
    if (!isDynamicGlob(comparablePattern) && targetPath === comparablePattern)
      return pattern;
  }
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.length === 0) continue;
    const comparablePattern = pathForCompare(pattern);
    if (!isDynamicGlob(comparablePattern)) continue;
    try {
      if (globToRegExp(comparablePattern).test(targetPath)) return pattern;
    } catch {
      continue;
    }
  }
  return null;
}

import { globToRegExp } from '../../../../lib/globToRegexp.js';

/**
 * Match one normalized repository path against an anchored review glob.
 * @param pattern Review rule pattern using the repository's minimal glob grammar.
 * @param candidatePath Normalized repository-relative path.
 * @returns True when the complete path matches, including root-level double-star prefixes.
 */
export function matchesReviewGlob(
  pattern: string,
  candidatePath: string,
): boolean {
  const normalizedPattern = pattern.replaceAll('\\', '/');
  const normalizedPath = candidatePath.replaceAll('\\', '/');
  if (globToRegExp(normalizedPattern).test(normalizedPath)) return true;
  return normalizedPattern.startsWith('**/')
    ? globToRegExp(normalizedPattern.slice(3)).test(normalizedPath)
    : false;
}

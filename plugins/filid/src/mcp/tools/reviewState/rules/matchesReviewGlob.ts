import { globToRegExp } from '../../../../lib/globToRegexp.js';

/**
 * Match one normalized repository path against an anchored review glob.
 * @param pattern Review rule pattern using the repository's minimal glob grammar.
 * @param candidatePath Normalized repository-relative path.
 * @returns True when the complete path matches. A leading recursive wildcard
 * spans zero segments, so a root-level file matches without a second attempt.
 */
export function matchesReviewGlob(
  pattern: string,
  candidatePath: string,
): boolean {
  return globToRegExp(pattern.replaceAll('\\', '/')).test(
    candidatePath.replaceAll('\\', '/'),
  );
}

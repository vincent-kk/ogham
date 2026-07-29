import {
  GENERATED_PATH_WILDCARD,
  REVIEW_PATH_SEGMENT_SEPARATOR,
} from '../../../../constants/reviewState.js';

/**
 * Does a repository-relative path fall under one declared generated-path pattern?
 *
 * Matching is segment by segment: a literal segment matches itself and a lone
 * wildcard segment matches exactly one segment, whatever it holds. Trailing
 * segments in the path are a match, so a two-segment pattern covers files
 * nested under it; extra segments in the pattern are not, so a pattern ending
 * in a directory name never covers a sibling file of that name.
 * @param pattern One `structure.generatedPaths` entry.
 * @param candidatePath Repository-relative path reported by git.
 * @returns True when every pattern segment matches, in order.
 */
export function matchesGeneratedPath(
  pattern: string,
  candidatePath: string,
): boolean {
  const patternSegments = pattern.split(REVIEW_PATH_SEGMENT_SEPARATOR);
  const pathSegments = candidatePath.split(REVIEW_PATH_SEGMENT_SEPARATOR);
  if (patternSegments.length > pathSegments.length) return false;
  return patternSegments.every(
    (segment, index) =>
      segment === GENERATED_PATH_WILDCARD || segment === pathSegments[index],
  );
}

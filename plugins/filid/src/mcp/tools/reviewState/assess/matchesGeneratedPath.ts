import { matchesPathPattern } from '../../../../lib/matchesPathPattern.js';

/**
 * Does a repository-relative path fall under one declared generated-path pattern?
 *
 * The shared project-relative minimal glob grammar matches the path or any
 * ancestor, so tracked build output covers descendants.
 * @param pattern One `structure.generatedPaths` entry.
 * @param candidatePath Repository-relative path reported by git.
 * @returns True when every pattern segment matches, in order.
 */
export function matchesGeneratedPath(
  pattern: string,
  candidatePath: string,
): boolean {
  return matchesPathPattern(pattern, candidatePath);
}

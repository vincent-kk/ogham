import { REVIEW_HANDOFF_PATH_LIMIT } from '../../../../../constants/reviewState.js';

/**
 * Replace an oversized handoff path with its nearest serializable ancestor.
 * @param path Normalized project-relative path from evidence or a caller claim.
 * @returns A real ancestor within the handoff path limit, or project root.
 */
export function boundHandoffPath(path: string): string {
  let bounded = path;
  while (bounded.length > REVIEW_HANDOFF_PATH_LIMIT && bounded.includes('/'))
    bounded = bounded.slice(0, bounded.lastIndexOf('/'));
  if (bounded.length === 0 || bounded.length > REVIEW_HANDOFF_PATH_LIMIT)
    return '.';
  return bounded;
}

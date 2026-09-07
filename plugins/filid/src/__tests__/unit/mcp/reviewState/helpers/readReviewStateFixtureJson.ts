import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

/**
 * Parse one required JSON artifact from a review-state fixture.
 *
 * @param path - Absolute fixture artifact path expected to exist.
 * @returns Parsed JSON object stored at the path.
 * @throws When the expected artifact is absent.
 */
export function readReviewStateFixtureJson(
  path: string,
): Record<string, unknown> {
  const content = readUtf8FileIfExistsSync(path);
  if (content === null) throw new Error(`Missing JSON fixture: ${path}`);
  return JSON.parse(content) as Record<string, unknown>;
}

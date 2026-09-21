import { configureReviewGroups } from '../../../unit/mcp/reviewState/helpers/configureReviewGroups.js';

import { createPinnedReviewRepository } from './createPinnedReviewRepository.js';
import { INTENT_GAP_REVIEW_REPOSITORY } from './reviewFlowRepositoryFiles.js';

/**
 * Build the repository the preserved S0 review state was prepared from:
 * the pinned INTENT-gap repository with an ignored one-file-per-group review config.
 * @returns Absolute repository root whose HEAD equals the preserved state's head commit.
 */
export async function createPreservedReviewRepository(): Promise<string> {
  const projectRoot = await createPinnedReviewRepository(
    INTENT_GAP_REVIEW_REPOSITORY,
  );
  await configureReviewGroups(projectRoot, 1);
  return projectRoot;
}

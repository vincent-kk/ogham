import { configureReviewGroups } from '../../../unit/mcp/reviewState/helpers/configureReviewGroups.js';

import { createPinnedReviewRepository } from './createPinnedReviewRepository.js';
import { INTENT_GAP_REVIEW_REPOSITORY } from './reviewFlowRepositoryFiles.js';

/**
 * Build the repository the preserved S0 review state was prepared from:
 * the pinned INTENT-gap repository with an ignored one-file-per-group review config.
 * Its dated DETAIL bodies are intentionally invalid: preserved commit IDs require
 * the original bytes, so this replay fixture cannot follow current document policy.
 * @returns Absolute repository root whose HEAD equals the preserved state's head commit.
 */
export async function createPreservedReviewRepository(): Promise<string> {
  const projectRoot = await createPinnedReviewRepository({
    ...INTENT_GAP_REVIEW_REPOSITORY,
    base: Object.fromEntries(
      Object.entries(INTENT_GAP_REVIEW_REPOSITORY.base).map(
        ([path, content]) => [
          path,
          path.endsWith('DETAIL.md')
            ? content.replace('When the contract changes.', '2026-09-07')
            : content,
        ],
      ),
    ),
  });
  await configureReviewGroups(projectRoot, 1);
  return projectRoot;
}

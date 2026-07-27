import { createHash } from 'node:crypto';

import {
  REVIEW_STATE_BRANCH_FALLBACK_NAME,
  REVIEW_STATE_BRANCH_KEY_SEPARATOR,
  REVIEW_STATE_BRANCH_READABLE_LIMIT,
  REVIEW_STATE_EDGE_PUNCTUATION_PATTERN,
  REVIEW_STATE_HASH_ALGORITHM,
  REVIEW_STATE_HASH_ENCODING,
  REVIEW_STATE_UNSAFE_BRANCH_PATTERN,
} from '../../../../constants/reviewState.js';

import { validateReviewBranchName } from './validateReviewBranchName.js';

export function normalizeReviewBranch(branchName: string): string {
  validateReviewBranchName(branchName);
  const readable =
    branchName
      .replace(
        REVIEW_STATE_UNSAFE_BRANCH_PATTERN,
        REVIEW_STATE_BRANCH_KEY_SEPARATOR,
      )
      .replace(REVIEW_STATE_EDGE_PUNCTUATION_PATTERN, '')
      .slice(0, REVIEW_STATE_BRANCH_READABLE_LIMIT) ||
    REVIEW_STATE_BRANCH_FALLBACK_NAME;
  const digest = createHash(REVIEW_STATE_HASH_ALGORITHM)
    .update(branchName)
    .digest(REVIEW_STATE_HASH_ENCODING);

  return `${readable}${REVIEW_STATE_BRANCH_KEY_SEPARATOR}${digest}`;
}

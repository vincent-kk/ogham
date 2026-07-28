import { portableIsAbsolute } from '@ogham/cross-platform/compat';

import {
  REVIEW_STATE_CONTROL_CHARACTER_PATTERN,
  REVIEW_STATE_CURRENT_SEGMENT,
  REVIEW_STATE_ERROR_MESSAGES,
  REVIEW_STATE_PATH_SEPARATOR_PATTERN,
  REVIEW_STATE_TRAVERSAL_SEGMENT,
} from '../../../../constants/reviewState.js';

export function validateReviewBranchName(branchName: string): void {
  const components = branchName.split(REVIEW_STATE_PATH_SEPARATOR_PATTERN);
  if (
    !branchName ||
    branchName !== branchName.trim() ||
    portableIsAbsolute(branchName) ||
    REVIEW_STATE_CONTROL_CHARACTER_PATTERN.test(branchName) ||
    branchName.includes(REVIEW_STATE_TRAVERSAL_SEGMENT) ||
    components.includes(REVIEW_STATE_CURRENT_SEGMENT) ||
    components.includes(REVIEW_STATE_TRAVERSAL_SEGMENT)
  )
    throw new Error(REVIEW_STATE_ERROR_MESSAGES.BRANCH_NAME_INVALID);
}

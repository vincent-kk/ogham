import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../../constants/reviewState.js';

import type { ReviewStateRecord } from './reviewStateTypes.js';

/** Verdict line of a sealed report's frontmatter. */
const VERDICT_LINE =
  /^verdict:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)\s*$/mu;

/**
 * Look for a review that lost its state file but left its work behind.
 *
 * Deleting `review-state.json` is not something filid can prevent, so a
 * prepare that finds artifacts without a state records that it is replacing
 * something rather than reporting a first review.
 *
 * @param branchDirectory Absolute branch-level review directory, which may not exist.
 * @returns Whether an earlier generation or sealed report remains, and the verdict that report carries.
 */
export function readAbandonedReviewTrace(branchDirectory: string): {
  abandoned: boolean;
  priorVerdict?: ReviewStateRecord['verdict'] & string;
} {
  let entries;
  try {
    entries = readdirSync(branchDirectory, {
      withFileTypes: true,
      recursive: true,
    });
  } catch {
    return { abandoned: false };
  }
  let abandoned = false;
  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      entry.name === REVIEW_STATE_DIRECTORY_NAMES.GENERATIONS
    ) {
      abandoned = true;
      continue;
    }
    if (!entry.isFile() || entry.name !== REVIEW_STATE_FILE_NAMES.REPORT)
      continue;
    abandoned = true;
    const verdict = VERDICT_LINE.exec(
      readUtf8FileIfExistsSync(join(entry.parentPath, entry.name)) ?? '',
    );
    if (verdict)
      return { abandoned: true, priorVerdict: verdict[1] as 'APPROVED' };
  }
  return { abandoned };
}

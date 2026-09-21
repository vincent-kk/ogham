import { readdirSync, statSync } from 'node:fs';
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
 * something rather than reporting a first review. When several generation
 * directories carry a report with a verdict, the most recently modified
 * report is the one whose verdict is reported, since directory walk order
 * carries no recency guarantee.
 *
 * @param branchDirectory Absolute branch-level review directory, which may not exist.
 * @returns Whether an earlier generation or sealed report remains, and the verdict the most recently modified report carries.
 */
export function readAbandonedReviewTrace(branchDirectory: string): {
  abandoned: boolean;
  priorVerdict?: Exclude<ReviewStateRecord['verdict'], null>;
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
  let newest: {
    verdict: Exclude<ReviewStateRecord['verdict'], null>;
    mtimeMs: number;
  } | null = null;
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
    const path = join(entry.parentPath, entry.name);
    const verdict = VERDICT_LINE.exec(readUtf8FileIfExistsSync(path) ?? '');
    if (!verdict) continue;
    // The report can disappear between the read above and this stat; that
    // race is not a reason to fail prepare, so a vanished file is skipped
    // rather than left to throw ENOENT.
    const stats = statSync(path, { throwIfNoEntry: false });
    if (stats === undefined) continue;
    if (newest === null || stats.mtimeMs > newest.mtimeMs)
      newest = {
        verdict: verdict[1] as Exclude<ReviewStateRecord['verdict'], null>,
        mtimeMs: stats.mtimeMs,
      };
  }
  return newest ? { abandoned: true, priorVerdict: newest.verdict } : { abandoned };
}

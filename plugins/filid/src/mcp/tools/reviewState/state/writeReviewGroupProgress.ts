import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_JSON_INDENT,
  REVIEW_STATE_JSON_TRAILING_NEWLINE,
  REVIEW_STATE_PHASES,
} from '../../../../constants/reviewState.js';

import type { ReviewGroup } from './reviewGroupTypes.js';
import { ReviewStateRecordSchema } from './reviewStateRecordSchema.js';
import type { ReviewStateRecord } from './reviewStateTypes.js';
import { writeReviewState } from './writeReviewState.js';

/**
 * Merge one actor's progress without losing concurrently completed peer groups.
 * @param statePath Canonical active state guarded by the caller's path resolver.
 * @param update Snapshot containing the updated target group.
 * @param expected Exact target group observed before asynchronous work.
 * @returns Latest state with only the target group's update applied.
 * @throws On a generation/phase change, same-group conflict or lock timeout.
 */
export function writeReviewGroupProgress(
  statePath: string,
  update: ReviewStateRecord,
  expected: ReviewGroup,
): ReviewStateRecord {
  if (!update.incremental) {
    writeReviewState(statePath, update);
    return update;
  }
  assertNoSymlinkDescendantsSync(update.projectRoot, statePath);
  assertNoSymlinkDescendantsSync(update.projectRoot, `${statePath}.lock`);
  const result = withFileLockSync(statePath, () => {
    const bytes = readUtf8FileIfExistsSync(statePath);
    if (bytes === null)
      throw new Error('review generation changed before group write');
    const current = ReviewStateRecordSchema.parse(JSON.parse(bytes));
    if (
      current.generationId !== update.generationId ||
      current.sourceHash !== update.sourceHash ||
      current.phase !== REVIEW_STATE_PHASES.PREPARED
    )
      throw new Error('review generation changed before group write');
    const found = current.groups.find((group) => group.id === expected.id);
    if (JSON.stringify(found) !== JSON.stringify(expected))
      throw new Error('review group progress conflict');
    const changed = update.groups.find((group) => group.id === expected.id)!;
    const merged = {
      ...current,
      groups: current.groups.map((group) =>
        group.id === expected.id ? changed : group,
      ),
    };
    ReviewStateRecordSchema.parse(merged);
    writeFileAtomicallySync(
      statePath,
      `${JSON.stringify(merged, null, REVIEW_STATE_JSON_INDENT)}${REVIEW_STATE_JSON_TRAILING_NEWLINE}`,
    );
    return merged;
  });
  if (!result.acquired) throw new Error('review group progress lock timed out');
  return result.value;
}

import { readFileSync, writeFileSync } from 'node:fs';

import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Rewrite the active review state in place, bypassing the generation-checked writer.
 * @param projectRoot Absolute fixture repository root.
 * @param branchName Branch whose active state is edited.
 * @param edit Mutation applied to the parsed state record.
 * @returns Nothing; the state file holds the edited record.
 */
export function editPersistedReviewState(
  projectRoot: string,
  branchName: string,
  edit: (state: ReviewStateRecord) => void,
): void {
  const { statePath } = resolveReviewStatePaths(projectRoot, branchName);
  const state = JSON.parse(
    readFileSync(statePath, 'utf8'),
  ) as ReviewStateRecord;
  edit(state);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

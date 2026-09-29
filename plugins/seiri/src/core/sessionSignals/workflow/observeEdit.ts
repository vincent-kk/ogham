import {
  EDIT_TRACKED_FILES_CAP,
  type EditNoticeKind,
} from '../../../constants/editNotice.js';
import type { WorkflowIdentity } from '../../../types/workflow.js';

import { prepareDirectory } from './prepareDirectory.js';
import { advanceBoundary } from './utils/advanceBoundary.js';
import { withWorkflowState } from './withWorkflowState.js';

/**
 * Record one file edit in the actor's current turn and report the edit
 * notice it makes due. Seeds an absent, expired, corrupt, or
 * generation-zero actor from the payload's native turn, as an entry request
 * does. The caller never passes a child actor.
 * @param identity Host-normalized main-actor identity; without `turn` the call is a no-op.
 * @param fileHash `workflowHash` of the edited file's repository-relative path.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @param threshold Distinct files this turn at which the `spread` notice is due.
 * @returns The notice due now with the turn's distinct file count, or
 *   `undefined` when none is due, the actor's anchor is another turn, a
 *   binding is active, or the state could not be locked or written.
 */
export function observeEdit(
  identity: WorkflowIdentity,
  fileHash: string,
  now: number,
  threshold: number,
): { kind: EditNoticeKind; fileCount: number } | undefined {
  if (!identity.turn) return undefined;
  return withWorkflowState(identity, prepareDirectory, now, (state) => {
    if (state.generation === 0) advanceBoundary(state, identity.turn, false);
    if (state.turn !== identity.turn || state.binding?.state === 'active')
      return undefined;
    const edits = (state.edits ??= { files: [], notices: [] });
    if (
      !edits.files.includes(fileHash) &&
      edits.files.length < EDIT_TRACKED_FILES_CAP
    )
      edits.files.push(fileHash);
    const fileCount = edits.files.length;
    const kind: EditNoticeKind | undefined =
      fileCount === 1 && !edits.notices.includes('first')
        ? 'first'
        : fileCount >= threshold && !edits.notices.includes('spread')
          ? 'spread'
          : undefined;
    if (!kind) return undefined;
    edits.notices.push(kind);
    return { kind, fileCount };
  });
}

import {
  canonicalizeTargetPathSync,
  portableIsAbsolute,
  portableRelative,
} from '@ogham/cross-platform';

import {
  EDIT_NOTICE_EXCLUDED_PREFIXES,
  EDIT_NOTICE_FILE_THRESHOLD,
} from '../../../constants/editNotice.js';
import { observeEdit } from '../../../core/sessionSignals/workflow/observeEdit.js';
import { findRepoRoot } from '../../../core/utils/findRepoRoot.js';
import type { PreToolUseInput } from '../../../types/hooks.js';
import type { WorkflowIdentity } from '../../../types/workflow.js';
import { renderEditNotice } from '../../shared/progressLine/renderEditNotice.js';
import { workflowHash } from '../../shared/workflowHost/workflowHash.js';

/**
 * Resolve one file edit to its repository-relative path and return the edit
 * notice it makes due for the main actor. Both the target and the cwd are
 * canonicalized first, so a symlinked cwd, a cwd-relative Codex patch path,
 * and a not-yet-existing Write target land on the same relative path.
 * @param input Edit tool payload carrying `tool_input.file_path` or `notebook_path`.
 * @param identity Actor identity already resolved for this payload.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 * @returns The notice line, or `undefined` for a child actor, a missing or
 *   non-string path, a path outside the repository or under an excluded
 *   prefix, no notice due, or any filesystem error while resolving the path.
 */
export function editNotice(
  input: PreToolUseInput,
  identity: WorkflowIdentity,
  now: number,
): string | undefined {
  if (input.agent_id) return undefined;
  try {
    const target =
      input.tool_input?.file_path ?? input.tool_input?.notebook_path;
    if (typeof target !== 'string') return undefined;
    const root = findRepoRoot(canonicalizeTargetPathSync(input.cwd, '.'));
    const relative = portableRelative(
      root,
      canonicalizeTargetPathSync(input.cwd, target),
    ).replaceAll('\\', '/');
    if (
      !relative ||
      /^\.\.(\/|$)/.test(relative) ||
      portableIsAbsolute(relative) ||
      EDIT_NOTICE_EXCLUDED_PREFIXES.some((prefix) =>
        relative.startsWith(prefix),
      )
    )
      return undefined;
    const due = observeEdit(
      identity,
      workflowHash(relative),
      now,
      EDIT_NOTICE_FILE_THRESHOLD,
    );
    return due && renderEditNotice(due.kind, due.fileCount);
  } catch {
    return undefined;
  }
}

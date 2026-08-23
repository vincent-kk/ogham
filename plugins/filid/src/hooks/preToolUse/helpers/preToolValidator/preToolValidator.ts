import { canonicalizeTargetPathSync } from '@ogham/cross-platform';

import {
  DENY_RETRY_GUIDANCE,
  HOOK_TOOL_NAME,
} from '../../../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isDetailMd } from '../../../shared/utils/isDetailMd.js';
import { isIntentMd } from '../../../shared/utils/isIntentMd.js';
import { validateCwd } from '../../../utils/validateCwd.js';

import { handleDetailMdWrite } from './utils/handleDetailMdWrite.js';
import { handleIntentMdEdit } from './utils/handleIntentMdEdit.js';
import { handleIntentMdWrite } from './utils/handleIntentMdWrite.js';

export {
  projectMoveContent,
  type MoveProjectionResult,
} from './utils/projectMoveContent.js';

/**
 * PreToolUse hook logic for INTENT.md/DETAIL.md validation.
 *
 * For Write tool targeting INTENT.md:
 * - Blocks if content exceeds 50-line limit (error)
 * - Warns if missing 3-tier boundary sections (warning, no block)
 *
 * For Write tool targeting DETAIL.md:
 * - Blocks if detected as append-only (when oldContent provided)
 *
 * For Edit tool targeting INTENT.md:
 * - Warns when new_string exceeds 20 lines (partial edits cannot be validated for line limit)
 *
 * Delete of INTENT.md or DETAIL.md is denied because it removes the active
 * boundary contract rather than revising it.
 *
 * Branch names and criteria ledgers do not affect this validator.
 */
export function validatePreToolUse(
  input: PreToolUseInput,
  oldContent?: string,
): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  const documentPath =
    input.tool_name === HOOK_TOOL_NAME.DELETE
      ? canonicalizeTargetPathSync(safeCwd, filePath, {
          preserveTerminalEntry: true,
        })
      : filePath;

  if (
    input.tool_name === HOOK_TOOL_NAME.DELETE &&
    (isIntentMd(documentPath) || isDetailMd(documentPath))
  )
    return {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'deny',
        permissionDecisionReason: `Delete rejected: ${filePath} is an FCA contract document. Revise the contract instead of deleting it. ${DENY_RETRY_GUIDANCE}`,
      },
    };

  if (input.tool_name === HOOK_TOOL_NAME.EDIT && isIntentMd(filePath))
    return handleIntentMdEdit(input, safeCwd, filePath);

  const content = input.tool_input.content;

  if (input.tool_name !== HOOK_TOOL_NAME.WRITE) return { continue: true };

  // No truthiness gate: empty content must still satisfy the full document.
  if (isIntentMd(filePath)) return handleIntentMdWrite(content ?? '');

  if (!content) return { continue: true };

  if (isDetailMd(filePath) && oldContent !== undefined)
    return handleDetailMdWrite(content, oldContent);

  return { continue: true };
}

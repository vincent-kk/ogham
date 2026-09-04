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
 * - Validates projected content against the line cap when the edit is exact
 * - Warns when an inexact edit's new_string exceeds 20 lines
 *
 * Delete of INTENT.md or DETAIL.md is denied because it removes the active
 * boundary contract rather than revising it.
 *
 * Branch names and criteria ledgers do not affect this validator.
 * Write/Edit follow the physical target; Delete preserves the final entry.
 *
 * @param input - Host operation with a cwd accepted by the hook boundary.
 * @param oldContent - Existing physical DETAIL content, when readable.
 * @returns The operation's permission decision and optional warning context.
 * @throws Filesystem canonicalization errors other than a missing target.
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
      : input.tool_name === HOOK_TOOL_NAME.WRITE ||
          input.tool_name === HOOK_TOOL_NAME.EDIT
        ? canonicalizeTargetPathSync(safeCwd, filePath)
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

  if (input.tool_name === HOOK_TOOL_NAME.EDIT && isIntentMd(documentPath))
    return handleIntentMdEdit(input, safeCwd, documentPath);

  const content = input.tool_input.content;

  if (input.tool_name !== HOOK_TOOL_NAME.WRITE) return { continue: true };

  // No truthiness gate: empty content must still satisfy the full document.
  if (isIntentMd(documentPath)) return handleIntentMdWrite(content ?? '');

  if (!content) return { continue: true };

  if (isDetailMd(documentPath) && oldContent !== undefined)
    return handleDetailMdWrite(content, oldContent);

  return { continue: true };
}

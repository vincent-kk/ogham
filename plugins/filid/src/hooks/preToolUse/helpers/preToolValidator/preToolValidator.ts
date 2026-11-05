import { lstatSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import {
  DENY_RETRY_GUIDANCE,
  HOOK_TOOL_NAME,
} from '../../../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isDetailMd } from '../../../shared/utils/isDetailMd.js';
import { isIntentMd } from '../../../shared/utils/isIntentMd.js';
import { validateCwd } from '../../../utils/validateCwd.js';
import { resolveHookTargetPath } from '../../utils/resolveHookTargetPath.js';

import { handleDetailMdWrite } from './utils/handleDetailMdWrite.js';
import { handleIntentMdEdit } from './utils/handleIntentMdEdit.js';
import { handleIntentMdWrite } from './utils/handleIntentMdWrite.js';
import { hasEntryPoint } from './utils/hasEntryPoint.js';

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
 * - Validates every full write and detects append-only when oldContent is provided
 *
 * For Edit tool targeting INTENT.md:
 * - Validates projected content against the line cap when the edit is exact
 * - Warns when an inexact edit's new_string exceeds 20 lines
 *
 * INTENT.md deletion permits demotion only without an entry point; symlinks or
 * unreadable evidence keep it denied. DETAIL.md deletion returns retention guidance.
 *
 * Branch names and criteria ledgers do not affect this validator.
 * Write/Edit follow the physical target; Delete preserves the final entry.
 *
 * @param input - Host operation with a cwd accepted by the hook boundary.
 * @param oldContent - Existing physical DETAIL content, when readable.
 * @returns The operation's permission decision and optional warning context.
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
      ? resolveHookTargetPath(safeCwd, filePath, true)
      : input.tool_name === HOOK_TOOL_NAME.WRITE ||
          input.tool_name === HOOK_TOOL_NAME.EDIT
        ? resolveHookTargetPath(safeCwd, filePath)
        : filePath;

  if (input.tool_name === HOOK_TOOL_NAME.DELETE && isDetailMd(documentPath))
    return {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'allow',
        additionalContext:
          'DETAIL.md is optional: delete it only when it holds no reason, policy, exemption or acceptance group that a verification file binds.',
      },
    };

  if (input.tool_name === HOOK_TOOL_NAME.DELETE && isIntentMd(documentPath)) {
    const directory = dirname(documentPath);
    let isSymlink = true;
    try {
      isSymlink = lstatSync(documentPath).isSymbolicLink();
    } catch {
      // Unreadable document metadata cannot establish a demotion.
    }
    if (!isSymlink && !hasEntryPoint(directory, safeCwd))
      return {
        continue: true,
        hookSpecificOutput: {
          permissionDecision: 'allow',
          additionalContext: `Demotion: ${directory} has no entry point, so deleting ${basename(documentPath)} drops its fractal claim. The parent DETAIL.md states first, as the parent's present decision, what the parent now owns and why that directory is not a fractal; add that statement now if it is missing.`,
        },
      };
    return {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'deny',
        permissionDecisionReason: `Delete rejected: ${filePath} is the fractal's boundary document. Revise it instead of deleting it. To demote this fractal to an organ, first state in the parent DETAIL.md, as the parent's present decision, what the parent now owns and why that directory is not a fractal; then remove its entry point (index or main file, framework entry, manifest, or entryPointOverrides entry) and delete INTENT.md and any DETAIL.md. ${DENY_RETRY_GUIDANCE}`,
      },
    };
  }

  if (input.tool_name === HOOK_TOOL_NAME.EDIT && isIntentMd(documentPath))
    return handleIntentMdEdit(input, safeCwd, documentPath);

  const content = input.tool_input.content;

  if (input.tool_name !== HOOK_TOOL_NAME.WRITE) return { continue: true };

  // No truthiness gate: empty content must still satisfy the full document.
  if (isIntentMd(documentPath)) return handleIntentMdWrite(content ?? '');

  if (isDetailMd(documentPath))
    return handleDetailMdWrite(content ?? '', oldContent);

  return { continue: true };
}

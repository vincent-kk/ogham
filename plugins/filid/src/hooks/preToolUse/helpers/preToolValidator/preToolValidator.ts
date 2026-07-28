import { HOOK_TOOL_NAME } from '../../../../constants/hookDefaults.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isDetailMd } from '../../../shared/utils/isDetailMd.js';
import { isIntentMd } from '../../../shared/utils/isIntentMd.js';
import { validateCwd } from '../../../utils/validateCwd.js';

import { handleDetailMdWrite } from './utils/handleDetailMdWrite.js';
import { handleIntentMdEdit } from './utils/handleIntentMdEdit.js';
import { handleIntentMdWrite } from './utils/handleIntentMdWrite.js';

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
 * Branch names and criteria ledgers do not affect this validator.
 */
export function validatePreToolUse(
  input: PreToolUseInput,
  oldContent?: string,
): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';

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

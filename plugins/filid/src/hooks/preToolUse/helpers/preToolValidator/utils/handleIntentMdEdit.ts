import { INTENT_MD_LINE_LIMIT } from '../../../../../constants/documentValidation.js';
import {
  DENY_RETRY_GUIDANCE,
  INTENT_EDIT_WARNING_LINE_COUNT,
} from '../../../../../constants/hookDefaults.js';
import type {
  HookOutput,
  PreToolUseInput,
} from '../../../../../types/hooks.js';

import { projectEdit } from './projectEdit.js';
import { readFileForEdit } from './readFileForEdit.js';

export function handleIntentMdEdit(
  input: PreToolUseInput,
  safeCwd: string,
  filePath: string,
): HookOutput {
  const newString = input.tool_input.new_string ?? '';
  const oldString = input.tool_input.old_string ?? '';
  const current = readFileForEdit(filePath, safeCwd);

  if (current !== undefined && oldString && current.includes(oldString)) {
    const projected = projectEdit(current, oldString, newString, input);
    const lineCount = projected.split('\n').length;
    if (lineCount <= INTENT_MD_LINE_LIMIT) return { continue: true };
    return {
      continue: true,
      hookSpecificOutput: {
        permissionDecision: 'deny',
        permissionDecisionReason:
          `This edit would grow INTENT.md to ${lineCount} lines, over ` +
          `the ${INTENT_MD_LINE_LIMIT}-line limit. Extract a sub-fractal ` +
          `(child dir + INTENT.md + index.ts) and move the overflow ` +
          `into it. ${DENY_RETRY_GUIDANCE}`,
      },
    };
  }

  const lineCount = newString.split('\n').length;
  if (lineCount <= INTENT_EDIT_WARNING_LINE_COUNT) return { continue: true };
  return {
    continue: true,
    hookSpecificOutput: {
      additionalContext:
        `Note: this Edit adds ${lineCount} new lines to INTENT.md — ` +
        `line limit (${INTENT_MD_LINE_LIMIT}) can't be checked on ` +
        `partial edits. Confirm the final file stays within ` +
        `${INTENT_MD_LINE_LIMIT} lines.`,
    },
  };
}

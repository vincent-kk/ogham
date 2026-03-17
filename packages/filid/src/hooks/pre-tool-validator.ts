import {
  validateDetailMd,
  validateIntentMd,
} from '../core/rules/document-validator.js';
import type { HookOutput, PreToolUseInput } from '../types/hooks.js';

import { isDetailMd, isIntentMd } from './shared.js';

export { isDetailMd } from './shared.js';

/**
 * PreToolUse hook logic for INTENT.md/DETAIL.md validation.
 *
 * For Write tool targeting INTENT.md:
 * - Blocks if content exceeds 50-line limit (error)
 * - Warns if missing 3-tier boundary sections (warning, no block)
 *
 * For Write tool targeting DETAIL.md:
 * - Blocks if detected as append-only (when oldDetailContent provided)
 *
 * For Edit tool targeting INTENT.md:
 * - Warns when new_string exceeds 20 lines (partial edits cannot be validated for line limit)
 */
export function validatePreToolUse(
  input: PreToolUseInput,
  oldDetailContent?: string,
): HookOutput {
  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';

  // Edit targeting INTENT.md: 대규모 편집(>20줄) 시 경고 주입 (차단하지 않음)
  if (input.tool_name === 'Edit' && isIntentMd(filePath)) {
    const newString = (input.tool_input.new_string as string) ?? '';
    const lineCount = newString.split('\n').length;
    if (lineCount > 20) {
      return {
        continue: true,
        hookSpecificOutput: {
          additionalContext:
            `Note: Editing INTENT.md via Edit tool with ${lineCount} new lines — ` +
            'line limit (50) cannot be enforced on partial edits. ' +
            'Verify the final line count does not exceed 50 lines after editing.',
        },
      };
    }
    return { continue: true };
  }

  const content = input.tool_input.content;

  // Write만 검증 (Edit은 위에서 처리됨)
  if (input.tool_name !== 'Write' || !content) {
    return { continue: true };
  }

  // INTENT.md validation
  if (isIntentMd(filePath)) {
    const result = validateIntentMd(content);

    if (!result.valid) {
      const errorMessages = result.violations
        .filter((v) => v.severity === 'error')
        .map((v) => v.message)
        .join('; ');
      return {
        continue: false,
        hookSpecificOutput: {
          additionalContext: `BLOCKED: ${errorMessages}`,
        },
      };
    }

    // Check for warnings (don't block, but inform)
    const warnings = result.violations.filter((v) => v.severity === 'warning');
    if (warnings.length > 0) {
      return {
        continue: true,
        hookSpecificOutput: {
          additionalContext: warnings.map((w) => w.message).join('; '),
        },
      };
    }

    return { continue: true };
  }

  // DETAIL.md validation
  if (isDetailMd(filePath) && oldDetailContent !== undefined) {
    const result = validateDetailMd(content, oldDetailContent);

    if (!result.valid) {
      const errorMessages = result.violations
        .filter((v) => v.severity === 'error')
        .map((v) => v.message)
        .join('; ');
      return {
        continue: false,
        hookSpecificOutput: {
          additionalContext: `BLOCKED: ${errorMessages}`,
        },
      };
    }
  }

  return { continue: true };
}

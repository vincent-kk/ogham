import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import {
  validateDetailMd,
  validateIntentMd,
} from '../../core/rules/document-validator/document-validator.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { isDetailMd, isIntentMd } from '../shared/shared.js';
import { validateCwd } from '../utils/validate-cwd.js';

const INTENT_MD_LINE_LIMIT = 50;

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
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';

  // Edit targeting INTENT.md: simulate the replacement and enforce the 50-line
  // limit on the projected content. Falls back to a soft warning only when the
  // file cannot be read or the old_string cannot be located (e.g. new file).
  if (input.tool_name === 'Edit' && isIntentMd(filePath)) {
    const newString = (input.tool_input.new_string as string) ?? '';
    const oldString = (input.tool_input.old_string as string) ?? '';

    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(safeCwd, filePath);

    let current: string | undefined;
    try {
      current = readFileSync(absPath, 'utf-8');
    } catch {
      /* file unreadable — fall through to warning fallback */
    }

    if (current !== undefined && oldString && current.includes(oldString)) {
      const projected = current.replace(oldString, newString);
      const lineCount = projected.split('\n').length;
      if (lineCount > INTENT_MD_LINE_LIMIT) {
        return {
          continue: false,
          hookSpecificOutput: {
            additionalContext:
              `BLOCKED: Edit would grow INTENT.md to ${lineCount} lines ` +
              `(limit ${INTENT_MD_LINE_LIMIT}). ` +
              'Decompose the module into smaller fractal nodes instead of ' +
              'expanding INTENT.md.',
          },
        };
      }
      return { continue: true };
    }

    // Fallback: could not simulate (file missing or old_string not found).
    // Warn on large new_string insertions so the agent manually verifies.
    const lineCount = newString.split('\n').length;
    if (lineCount > 20) {
      return {
        continue: true,
        hookSpecificOutput: {
          additionalContext:
            `Note: Editing INTENT.md via Edit tool with ${lineCount} new lines — ` +
            `line limit (${INTENT_MD_LINE_LIMIT}) cannot be enforced on partial edits. ` +
            `Verify the final line count does not exceed ${INTENT_MD_LINE_LIMIT} lines after editing.`,
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

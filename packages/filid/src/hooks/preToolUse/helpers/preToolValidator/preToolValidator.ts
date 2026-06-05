import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { DENY_RETRY_GUIDANCE } from '../../../../constants/hookDefaults.js';
import {
  validateDetailMd,
  validateIntentMd,
} from '../../../../core/rules/documentValidator/documentValidator.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isDetailMd, isIntentMd } from '../../../shared/shared.js';
import { validateCwd } from '../../../utils/validateCwd.js';

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
            `Note: this Edit adds ${lineCount} new lines to INTENT.md — ` +
            `line limit (${INTENT_MD_LINE_LIMIT}) can't be checked on ` +
            `partial edits. Confirm the final file stays within ` +
            `${INTENT_MD_LINE_LIMIT} lines.`,
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
        continue: true,
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason:
            `INTENT.md write rejected: ${errorMessages}. Add the missing ` +
            `3-tier sections (Always do / Ask first / Never do) and keep ` +
            `it under ${INTENT_MD_LINE_LIMIT} lines. ${DENY_RETRY_GUIDANCE}`,
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
        continue: true,
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason:
            `DETAIL.md write rejected: ${errorMessages}. Rewrite it to the ` +
            `current state — keep only the live API contract and ` +
            `acceptance criteria, drop superseded history, never append. ` +
            `${DENY_RETRY_GUIDANCE}`,
        },
      };
    }
  }

  return { continue: true };
}

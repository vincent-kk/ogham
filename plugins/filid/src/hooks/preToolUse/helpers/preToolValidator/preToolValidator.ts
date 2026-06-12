import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { DENY_RETRY_GUIDANCE } from '../../../../constants/hookDefaults.js';
import {
  validateCriteriaMd,
  validateDetailMd,
  validateIntentMd,
} from '../../../../core/rules/documentValidator/documentValidator.js';
import type { CriteriaMdValidation } from '../../../../types/documents.js';
import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { isCriteriaMd, isDetailMd, isIntentMd } from '../../../shared/shared.js';
import { validateCwd } from '../../../utils/validateCwd.js';

const INTENT_MD_LINE_LIMIT = 50;

/**
 * Project an Edit the way Claude Code's Edit tool applies it: literal
 * replacement (no `$&`/`$'` substitution patterns — hence the function
 * replacer) and every occurrence when `replace_all` is set.
 */
function projectEdit(
  current: string,
  oldString: string,
  newString: string,
  input: PreToolUseInput,
): string {
  return input.tool_input.replace_all === true
    ? current.split(oldString).join(newString)
    : current.replace(oldString, () => newString);
}

function denyCriteria(result: CriteriaMdValidation): HookOutput {
  const errorMessages = result.violations
    .filter((v) => v.severity === 'error')
    .map((v) => v.message)
    .join(' ');
  return {
    continue: true,
    hookSpecificOutput: {
      permissionDecision: 'deny',
      permissionDecisionReason:
        `criteria.md write rejected: ${errorMessages} The ledger is ` +
        `append-only with status transitions — never delete claims; every ` +
        `claim needs claim/observable/expected/scope/status fields. ` +
        `${DENY_RETRY_GUIDANCE}`,
    },
  };
}

/**
 * PreToolUse hook logic for INTENT.md/DETAIL.md/criteria.md validation.
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
 * For Write/Edit targeting `.filid/criteria.md` (acceptance-criteria ledger):
 * - Blocks claim deletion, missing required fields, invalid status,
 *   duplicate ids, and tautological claims
 *
 * `spikeExempt` (spike/* branch + INTENT.md/DETAIL.md target, judged by the
 * orchestrator) suspends the doc-hygiene denies above. It NEVER applies to
 * criteria.md — the ledger is the oracle that judges spike output, so its
 * gaming defenses hold in every mode.
 */
export function validatePreToolUse(
  input: PreToolUseInput,
  oldContent?: string,
  spikeExempt = false,
): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';

  // criteria.md validation — runs before the spike gate (never exempt)
  if (isCriteriaMd(filePath)) {
    if (input.tool_name === 'Edit') {
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
        const projected = projectEdit(current, oldString, newString, input);
        const result = validateCriteriaMd(projected, current);
        if (!result.valid) return denyCriteria(result);
        return { continue: true };
      }
      return {
        continue: true,
        hookSpecificOutput: {
          additionalContext:
            'Note: this Edit to .filid/criteria.md could not be simulated — ' +
            'confirm no claim was deleted and required fields ' +
            '(claim/observable/expected/scope/status) stay intact.',
        },
      };
    }
    // No truthiness gate: an empty-content Write is the trivial full-wipe
    // a gaming agent would use to escape FAIL claims — validate it too.
    if (input.tool_name === 'Write') {
      const result = validateCriteriaMd(
        input.tool_input.content ?? '',
        oldContent,
      );
      if (!result.valid) return denyCriteria(result);
    }
    return { continue: true };
  }

  // Spike mode: doc-hygiene denies for INTENT.md/DETAIL.md are suspended.
  // The judgment is audited by the orchestrator (mode-audit.jsonl).
  if (spikeExempt) return { continue: true };

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
      const projected = projectEdit(current, oldString, newString, input);
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
  if (isDetailMd(filePath) && oldContent !== undefined) {
    const result = validateDetailMd(content, oldContent);

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

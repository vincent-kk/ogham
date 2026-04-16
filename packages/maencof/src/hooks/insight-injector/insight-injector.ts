import {
  getSessionCaptureCount,
  readInsightConfig,
} from '../../core/insight-stats/index.js';

import { isMaencofVault } from '../shared/index.js';

export interface InsightInjectorInput {
  session_id?: string;
  cwd?: string;
  prompt?: string;
}

/**
 * UserPromptSubmit hook envelope. Claude Code surfaces the status banner to
 * the model via `hookSpecificOutput.additionalContext`; the top-level
 * `hookMessage` / `message` keys are silently dropped (see
 * `.omc/research/maencof-v030-hook-schema.md`).
 */
export interface InsightInjectorResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: 'UserPromptSubmit';
    additionalContext: string;
  };
}

function buildInjectorResult(
  additionalContext: string,
): InsightInjectorResult {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };
}

export function runInsightInjector(
  input: InsightInjectorInput,
): InsightInjectorResult {
  const cwd = input.cwd;
  if (!cwd) return { continue: true };

  if (!isMaencofVault(cwd)) return { continue: true };

  const config = readInsightConfig(cwd);
  if (!config.enabled) return { continue: true };

  const captured = getSessionCaptureCount(cwd);
  const max = config.max_captures_per_session;
  const sensitivity = config.sensitivity;
  const allowedCategories = Object.entries(config.category_filter)
    .filter(([, allowed]) => allowed === true)
    .map(([key]) => key)
    .join(',');

  if (max > 0 && captured >= max) {
    return buildInjectorResult(
      `<auto-insight status="limit-reached" captured="${captured}/${max}" />`,
    );
  }

  return buildInjectorResult(
    `<auto-insight status="active" sensitivity="${sensitivity}" captured="${captured}/${max}" allowed-categories="${allowedCategories}" />`,
  );
}

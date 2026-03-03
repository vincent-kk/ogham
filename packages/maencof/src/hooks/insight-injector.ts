import {
  getSessionCaptureCount,
  readInsightConfig,
} from '../core/insight-stats.js';

import { isMaencofVault } from './shared.js';

export interface InsightInjectorInput {
  session_id?: string;
  cwd?: string;
  prompt?: string;
}

export interface InsightInjectorResult {
  continue: boolean;
  hookMessage?: string;
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

  if (max > 0 && captured >= max) {
    return {
      continue: true,
      hookMessage: `<auto-insight status="limit-reached" captured="${captured}/${max}" />`,
    };
  }

  return {
    continue: true,
    hookMessage: `<auto-insight status="active" sensitivity="${sensitivity}" captured="${captured}/${max}" />`,
  };
}

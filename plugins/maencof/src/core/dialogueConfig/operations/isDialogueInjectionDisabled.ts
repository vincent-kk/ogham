/**
 * @file isDialogueInjectionDisabled.ts
 * @description Combines env `MAENCOF_DISABLE_DIALOGUE=1` (takes precedence) with
 *   `config.injection.enabled=false` OR-fallback to decide the off-switch.
 */
import { DIALOGUE_DISABLE_ENV } from '../../../constants/dialogue.js';

import { readDialogueConfig } from './readDialogueConfig.js';

/**
 * Returns true if meta-skill SessionStart injection MUST be skipped.
 *
 * Order of precedence:
 * 1. `MAENCOF_DISABLE_DIALOGUE === "1"` (env) — takes precedence
 * 2. `config.injection.enabled === false` — config file fallback
 * Either being off means off (OR semantics).
 */
export function isDialogueInjectionDisabled(
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env[DIALOGUE_DISABLE_ENV] === '1') return true;
  const config = readDialogueConfig(cwd);
  return config.injection.enabled === false;
}

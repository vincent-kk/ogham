/**
 * @file readDialogueConfig.ts
 * @description Dialogue discipline configuration loader.
 *   Reads `.maencof-meta/dialogue-config.json` with manual guard fallback to
 *   DEFAULT_DIALOGUE_CONFIG. Unknown keys in existing user config files (e.g.
 *   the retired `session_recap` axis) are ignored by normalization.
 */
import { existsSync, readFileSync } from 'node:fs';

import { DEFAULT_DIALOGUE_CONFIG } from '../../../constants/dialogue.js';
import type { DialogueConfig } from '../../../types/dialogueConfig.js';
import {
  isValidDialogueConfig,
  normalizeDialogueConfig,
} from '../../../types/dialogueConfigGuard.js';

import { dialogueConfigPath } from './dialogueConfigPath.js';

/**
 * Read the dialogue config from `.maencof-meta/dialogue-config.json`.
 * Falls back to DEFAULT_DIALOGUE_CONFIG on any failure (missing / parse / schema).
 */
export function readDialogueConfig(cwd: string): DialogueConfig {
  const configPath = dialogueConfigPath(cwd);
  if (!existsSync(configPath)) return DEFAULT_DIALOGUE_CONFIG;
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf-8'));
    return isValidDialogueConfig(parsed)
      ? normalizeDialogueConfig(parsed)
      : DEFAULT_DIALOGUE_CONFIG;
  } catch {
    return DEFAULT_DIALOGUE_CONFIG;
  }
}

/**
 * @file dialogue-config.ts
 * @description Dialogue discipline configuration loader.
 *   Reads `.maencof-meta/dialogue-config.json` with safeParse fallback to DEFAULT_DIALOGUE_CONFIG.
 *   Exposes `isDialogueInjectionDisabled` which combines env `MAENCOF_DISABLE_DIALOGUE=1`
 *   (takes precedence) with `config.injection.enabled=false` OR-fallback.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { MAENCOF_META_DIR } from '../../constants/directories.js';
import {
  DEFAULT_DIALOGUE_CONFIG,
  DIALOGUE_DISABLE_ENV,
  type DialogueConfig,
  DialogueConfigSchema,
} from '../../types/dialogue-config.js';

const DIALOGUE_CONFIG_FILE = 'dialogue-config.json';

function dialogueConfigPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, DIALOGUE_CONFIG_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read the dialogue config from `.maencof-meta/dialogue-config.json`.
 * Falls back to DEFAULT_DIALOGUE_CONFIG on any failure (missing / parse / schema).
 */
export function readDialogueConfig(cwd: string): DialogueConfig {
  const configPath = dialogueConfigPath(cwd);
  if (!existsSync(configPath)) return DEFAULT_DIALOGUE_CONFIG;
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const result = DialogueConfigSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_DIALOGUE_CONFIG;
  } catch {
    return DEFAULT_DIALOGUE_CONFIG;
  }
}

/**
 * Write the dialogue config to `.maencof-meta/dialogue-config.json`.
 */
export function writeDialogueConfig(cwd: string, config: DialogueConfig): void {
  const configPath = dialogueConfigPath(cwd);
  ensureDir(configPath);
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

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

/**
 * Returns true if the SessionEnd recap message MUST be suppressed.
 *
 * Independent of `isDialogueInjectionDisabled`; driven only by
 * `config.session_recap.enabled`. No env override for session recap —
 * the recap is a transient SessionEnd message, not a context injection.
 */
export function isSessionRecapDisabled(cwd: string): boolean {
  const config = readDialogueConfig(cwd);
  return config.session_recap.enabled === false;
}

/**
 * @file writeDialogueConfig.ts
 * @description Dialogue discipline configuration writer.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { DialogueConfig } from '../../../types/dialogueConfig.js';

import { dialogueConfigPath } from './dialogueConfigPath.js';

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Write the dialogue config to `.maencof-meta/dialogue-config.json`.
 */
export function writeDialogueConfig(cwd: string, config: DialogueConfig): void {
  const configPath = dialogueConfigPath(cwd);
  ensureDir(configPath);
  writeFileSync(configPath, JSON.stringify(config), 'utf-8');
}

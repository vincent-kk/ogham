import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { AUTONOMY_CONFIG_FILE as CONFIG_FILE } from '../../constants/autonomy.js';
import { MAENCOF_META_DIR } from '../../constants/directories.js';
import type { AutonomyLevel } from '../../types/common.js';

interface AutonomyConfig {
  level: AutonomyLevel;
  updatedAt: string;
}

function configPath(cwd: string): string {
  return join(cwd, MAENCOF_META_DIR, CONFIG_FILE);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readAutonomyLevel(cwd: string): AutonomyLevel {
  const fp = configPath(cwd);
  if (!existsSync(fp)) return 0;
  try {
    const config = JSON.parse(readFileSync(fp, 'utf-8')) as AutonomyConfig;
    return config.level;
  } catch {
    return 0;
  }
}

export function setAutonomyLevel(cwd: string, level: AutonomyLevel): void {
  const fp = configPath(cwd);
  ensureDir(fp);
  const config: AutonomyConfig = {
    level,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(fp, JSON.stringify(config), 'utf-8');
}

export function canAutoExecute(
  current: AutonomyLevel,
  required: AutonomyLevel,
): boolean {
  return current >= required;
}

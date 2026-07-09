/**
 * @file setAutonomyLevel.ts
 * @description autonomy-config.json 에 AutonomyLevel 을 기록한다.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { AutonomyLevel } from '../../../types/common.js';
import type { AutonomyConfig } from '../types/types.js';

import { configPath } from './configPath.js';

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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

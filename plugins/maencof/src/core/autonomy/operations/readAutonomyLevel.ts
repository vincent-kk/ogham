/**
 * @file readAutonomyLevel.ts
 * @description autonomy-config.json 에서 현재 AutonomyLevel 을 읽는다 (결측/손상 시 0).
 */
import { existsSync, readFileSync } from 'node:fs';

import type { AutonomyLevel } from '../../../types/common.js';
import type { AutonomyConfig } from '../types/types.js';

import { configPath } from './configPath.js';

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

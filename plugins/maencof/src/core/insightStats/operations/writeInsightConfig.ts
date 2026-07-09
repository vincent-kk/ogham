/**
 * @file writeInsightConfig.ts
 * @description Persist insight-config.json to the vault meta directory.
 */
import { writeFileSync } from 'node:fs';

import type { InsightConfig } from '../../../types/insight.js';

import { ensureDir } from './ensureDir.js';
import { metaPath } from './metaPath.js';

export function writeInsightConfig(cwd: string, config: InsightConfig): void {
  const configPath = metaPath(cwd, 'insight-config.json');
  ensureDir(configPath);
  writeFileSync(configPath, JSON.stringify(config), 'utf-8');
}

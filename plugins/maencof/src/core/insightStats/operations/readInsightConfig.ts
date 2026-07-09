/**
 * @file readInsightConfig.ts
 * @description Read insight-config.json, validating and falling back to defaults.
 */
import { existsSync, readFileSync } from 'node:fs';

import { DEFAULT_INSIGHT_CONFIG } from '../../../constants/insight.js';
import type { InsightConfig } from '../../../types/insight.js';
import {
  isValidInsightConfig,
  normalizeInsightConfig,
} from '../../../types/insightGuard.js';

import { metaPath } from './metaPath.js';

export function readInsightConfig(cwd: string): InsightConfig {
  const configPath = metaPath(cwd, 'insight-config.json');
  if (!existsSync(configPath)) return DEFAULT_INSIGHT_CONFIG;
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf-8'));
    return isValidInsightConfig(parsed)
      ? normalizeInsightConfig(parsed)
      : DEFAULT_INSIGHT_CONFIG;
  } catch {
    return DEFAULT_INSIGHT_CONFIG;
  }
}

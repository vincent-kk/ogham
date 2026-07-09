/**
 * @file autoAdjustSensitivity.ts
 * @description Suggest a sensitivity change from precision (proposal only, no write).
 */
import type { InsightConfig } from '../../../types/insight.js';

import { calculatePrecision } from './calculatePrecision.js';
import { readInsightConfig } from './readInsightConfig.js';
import { readInsightStats } from './readInsightStats.js';

export function autoAdjustSensitivity(cwd: string): {
  adjusted: boolean;
  message: string | null;
} {
  const stats = readInsightStats(cwd);
  const precision = calculatePrecision(stats);
  if (precision === null) return { adjusted: false, message: null };

  const config = readInsightConfig(cwd);
  let target: InsightConfig['sensitivity'] | null = null;

  if (precision < 0.3 && config.sensitivity !== 'low')
    target = config.sensitivity === 'high' ? 'medium' : 'low';
  else if (precision > 0.8 && config.sensitivity !== 'high')
    target = config.sensitivity === 'low' ? 'medium' : 'high';

  if (target === null) return { adjusted: false, message: null };

  const message = `Insight precision is ${(precision * 100).toFixed(0)}%. Sensitivity adjustment recommended: ${config.sensitivity} → ${target}`;
  return { adjusted: false, message };
}

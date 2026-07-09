/**
 * @file calculatePrecision.ts
 * @description Compute L5 promotion precision, or null when no signal yet.
 */
import type { InsightStats } from '../../../types/insight.js';

export function calculatePrecision(stats: InsightStats): number | null {
  const denominator = stats.l5_promoted + stats.l5_archived;
  if (denominator === 0) return null;
  return stats.l5_promoted / denominator;
}

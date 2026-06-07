import type { BiasLevel } from '../../../../types/debt.js';

export function determineBiasLevel(totalScore: number): BiasLevel {
  if (totalScore <= 5) return 'LOW_PRESSURE';
  if (totalScore <= 15) return 'MODERATE_PRESSURE';
  if (totalScore <= 30) return 'HIGH_PRESSURE';
  return 'CRITICAL_PRESSURE';
}

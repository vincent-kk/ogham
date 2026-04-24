import type { BiasResult, DebtItem } from '../../../../types/debt.js';
import {
  DEBT_BASE_WEIGHT,
  DEBT_WEIGHT_CAP,
} from '../../../../constants/debt-defaults.js';
import { determineBiasLevel } from '../utils/determine-bias-level.js';

export function handleCalculateBias(
  debts: DebtItem[],
  changedFractalPaths: string[],
  currentCommitSha: string,
): BiasResult {
  const changedSet = new Set(changedFractalPaths);

  const updatedDebts = debts.map((debt) => {
    if (!changedSet.has(debt.fractal_path)) {
      return { ...debt };
    }
    if (debt.last_review_commit === currentCommitSha) {
      return { ...debt };
    }
    const newTouchCount = debt.touch_count + 1;
    const newWeight = Math.min(
      DEBT_BASE_WEIGHT * Math.pow(2, newTouchCount),
      DEBT_WEIGHT_CAP,
    );
    return {
      ...debt,
      touch_count: newTouchCount,
      weight: newWeight,
      last_review_commit: currentCommitSha,
    };
  });

  const totalScore = updatedDebts.reduce((sum, d) => sum + d.weight, 0);
  const biasLevel = determineBiasLevel(totalScore);

  return { biasLevel, totalScore, updatedDebts };
}

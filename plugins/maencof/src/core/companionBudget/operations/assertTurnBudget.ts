/**
 * @file assertTurnBudget.ts
 * @description 매 턴 500자 예산 게이트. 초과 시 `ok:false` + 큰 순 offenders.
 */
import { TURN_IDENTITY_CHAR_BUDGET } from '../../../constants/companionIdentity.js';
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';
import type { BudgetResult } from '../types/types.js';

import { measure } from './measure.js';

export function assertTurnBudget(
  sections: CompanionSectionMinimal[],
): BudgetResult {
  return measure(sections, 'turn', TURN_IDENTITY_CHAR_BUDGET);
}

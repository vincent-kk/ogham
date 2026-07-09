/**
 * @file assertSessionBudget.ts
 * @description 세션 안전판(soft) 게이트 — 초과는 경고용이며 런타임 컷 아님.
 */
import { SESSION_IDENTITY_CHAR_BUDGET } from '../../../constants/companionIdentity.js';
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';
import type { BudgetResult } from '../types/types.js';

import { measure } from './measure.js';

export function assertSessionBudget(
  sections: CompanionSectionMinimal[],
): BudgetResult {
  return measure(sections, 'session', SESSION_IDENTITY_CHAR_BUDGET);
}

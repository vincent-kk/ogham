/**
 * @file measureTurnChars.ts
 * @description 매 턴 대상(`inject ∈ {turn, both}`) 섹션 렌더 총합(코드포인트).
 */
import { TURN_IDENTITY_CHAR_BUDGET } from '../../../constants/companionIdentity.js';
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';

import { measure } from './measure.js';

export function measureTurnChars(sections: CompanionSectionMinimal[]): number {
  return measure(sections, 'turn', TURN_IDENTITY_CHAR_BUDGET).total;
}

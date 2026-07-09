/**
 * @file measureSessionChars.ts
 * @description 세션 대상(`inject ∈ {session, both}`) 섹션 렌더 총합(코드포인트).
 */
import { SESSION_IDENTITY_CHAR_BUDGET } from '../../../constants/companionIdentity.js';
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';

import { measure } from './measure.js';

export function measureSessionChars(
  sections: CompanionSectionMinimal[],
): number {
  return measure(sections, 'session', SESSION_IDENTITY_CHAR_BUDGET).total;
}

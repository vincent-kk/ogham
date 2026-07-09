/**
 * @file measure.ts
 * @description 대상 채널 섹션을 렌더 길이로 측정하고 예산 대비 결과를 만든다.
 */
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';
import {
  renderIdentitySection,
  selectSections,
} from '../../turnContext/renderIdentitySection.js';
import type { BudgetResult } from '../types/types.js';

import { codePointLength } from './codePointLength.js';

export function measure(
  sections: CompanionSectionMinimal[],
  channel: 'turn' | 'session',
  budget: number,
): BudgetResult {
  const useBrief = channel === 'turn';
  const offenders = selectSections(sections, channel)
    .map((s) => ({
      key: s.key,
      chars: codePointLength(renderIdentitySection(s, { useBrief })),
    }))
    .sort((a, b) => b.chars - a.chars);
  const total = offenders.reduce((sum, o) => sum + o.chars, 0);
  return {
    ok: total <= budget,
    total,
    budget,
    overBy: Math.max(0, total - budget),
    offenders,
  };
}

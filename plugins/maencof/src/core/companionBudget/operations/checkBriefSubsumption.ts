/**
 * @file checkBriefSubsumption.ts
 * @description brief가 detail의 압축인지 최소 자동 검사(§5): 길이 역전(brief ≥ detail) 방지.
 * 의미 초과(brief ⊄ detail)는 완전 자동 판정 불가라 저작자 확인에 위임한다.
 */
import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';
import { resolveSectionText } from '../../turnContext/renderIdentitySection.js';
import type { BriefSubsumptionResult } from '../types/types.js';

import { codePointLength } from './codePointLength.js';

export function checkBriefSubsumption(
  section: CompanionSectionMinimal,
): BriefSubsumptionResult {
  const warnings: string[] = [];
  if (
    section.brief !== undefined &&
    codePointLength(resolveSectionText(section.brief)) >=
      codePointLength(resolveSectionText(section.detail))
  )
    warnings.push(
      `Section "${section.key}": brief is not shorter than detail — brief must compress detail, not expand it.`,
    );
  return { ok: warnings.length === 0, warnings };
}

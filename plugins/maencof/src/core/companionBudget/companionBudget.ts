/**
 * @file companionBudget.ts
 * @description 매 턴/세션 렌더 길이 측정 + 500자 예산 게이트 + brief 동기화 검증.
 *
 * 렌더러와 동일한 primitive(`renderIdentitySection`)로 측정해 측정↔렌더 드리프트를
 * 원천 차단한다. 예산은 저작(companion_edit·setup) 시점에 강제하며 런타임 컷은 없다.
 */
import {
  SESSION_IDENTITY_CHAR_BUDGET,
  TURN_IDENTITY_CHAR_BUDGET,
} from '../../constants/companionIdentity.js';
import type { CompanionSectionMinimal } from '../../types/companionGuard.js';
import {
  renderIdentitySection,
  selectSections,
} from '../turnContext/renderIdentitySection.js';

export interface BudgetOffender {
  key: string;
  chars: number;
}

export interface BudgetResult {
  ok: boolean;
  total: number;
  budget: number;
  overBy: number;
  /** 대상 섹션별 렌더 길이 — 큰 순. 강등·압축 후보 판단용 */
  offenders: BudgetOffender[];
}

export interface BriefSubsumptionResult {
  ok: boolean;
  warnings: string[];
}

/** 서로게이트 쌍을 한 글자로 세는 코드포인트 길이. */
function codePointLength(text: string): number {
  return [...text].length;
}

function measure(
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

/** 매 턴 대상(`inject ∈ {turn, both}`) 섹션 렌더 총합(코드포인트). */
export function measureTurnChars(sections: CompanionSectionMinimal[]): number {
  return measure(sections, 'turn', TURN_IDENTITY_CHAR_BUDGET).total;
}

/** 매 턴 500자 예산 게이트. 초과 시 `ok:false` + 큰 순 offenders. */
export function assertTurnBudget(
  sections: CompanionSectionMinimal[],
): BudgetResult {
  return measure(sections, 'turn', TURN_IDENTITY_CHAR_BUDGET);
}

/** 세션 대상(`inject ∈ {session, both}`) 섹션 렌더 총합(코드포인트). */
export function measureSessionChars(
  sections: CompanionSectionMinimal[],
): number {
  return measure(sections, 'session', SESSION_IDENTITY_CHAR_BUDGET).total;
}

/** 세션 안전판(soft) 게이트 — 초과는 경고용이며 런타임 컷 아님. */
export function assertSessionBudget(
  sections: CompanionSectionMinimal[],
): BudgetResult {
  return measure(sections, 'session', SESSION_IDENTITY_CHAR_BUDGET);
}

/**
 * brief가 detail의 압축인지 최소 자동 검사(§5): 길이 역전(brief ≥ detail) 방지.
 * 의미 초과(brief ⊄ detail)는 완전 자동 판정 불가라 저작자 확인에 위임한다.
 */
export function checkBriefSubsumption(
  section: CompanionSectionMinimal,
): BriefSubsumptionResult {
  const warnings: string[] = [];
  if (
    section.brief !== undefined &&
    codePointLength(section.brief) >= codePointLength(section.detail)
  )
    warnings.push(
      `Section "${section.key}": brief is not shorter than detail — brief must compress detail, not expand it.`,
    );
  return { ok: warnings.length === 0, warnings };
}

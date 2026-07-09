/**
 * @file types.ts
 * @description companionBudget 공개 타입 — 예산 측정 결과·offender·brief 검증.
 */
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

/**
 * @file summary.ts
 * @description PR 검증 결과의 인간 친화적 요약 타입 정의.
 *
 * generateHumanSummary()가 review session 파일을 파싱하여
 * HumanSummary를 생성할 때 사용한다.
 */

/** 요약 항목의 심각도 수준. */
export type SummaryItemSeverity = 'critical' | 'warning' | 'info' | 'pass';

/** 요약 항목 하나. 인간 리뷰어에게 제시되는 단위. */
export interface SummaryItem {
  /** 심각도 수준 */
  severity: SummaryItemSeverity;
  /** 인간 리뷰어에게 보여줄 메시지 */
  message: string;
  /** 관련 파일 경로 (있는 경우) */
  path?: string;
  /** 위반된 규칙 ID (BUILTIN_RULE_IDS 중 하나, 있는 경우) */
  ruleId?: string;
  /** 자동 수정 가능 여부 */
  autoFixable: boolean;
  /** 오류 확률 (0.0 - 1.0). 높을수록 인간 확인 우선순위 높음. */
  errorProbability: number;
}

/** PR 검증 결과의 인간 친화적 요약. */
export interface HumanSummary {
  /** 브랜치 이름 */
  branch: string;
  /** 요약 생성 시각 (ISO 8601) */
  generatedAt: string;
  /** 최종 verdict (APPROVED | REQUEST_CHANGES | INCONCLUSIVE | PASS | FAIL | UNKNOWN) */
  verdict: string;
  /** 인간이 확인해야 할 항목 (최대 5개, errorProbability 내림차순) */
  reviewItems: SummaryItem[];
  /** 자동 수정 가능 항목 (정보 제공용) */
  autoFixItems: SummaryItem[];
  /** 전체 발견 항목 수 */
  totalFindings: number;
  /** 렌더링된 마크다운 */
  markdown: string;
}

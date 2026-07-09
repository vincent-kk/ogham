/**
 * @file types.ts
 * @description contextAssembler 공개 타입 — 컨텍스트 항목·조립 옵션·조립 결과.
 */
/** 컨텍스트 항목 */
export interface ContextItem {
  /** 문서 경로 */
  path: string;
  /** 문서 제목 */
  title: string;
  /** 활성화 점수 */
  score: number;
  /** Layer */
  layer: number;
  /** 태그 목록 */
  tags: string[];
  /** 시드로부터의 홉 거리 */
  hops: number;
  /** 관계 설명 (시드 기준) */
  relation: string;
  /** 전문 내용 (include_full 시) */
  fullContent?: string;
}

/** 컨텍스트 조립 옵션 */
export interface AssembleOptions {
  /** 토큰 예산 (기본: 2000) */
  tokenBudget?: number;
  /** 상위 N개 전문 포함 여부 (기본: false) */
  includeFull?: boolean;
  /** 전문 포함 최대 문서 수 (기본: 3) */
  maxFullDocuments?: number;
}

/** 컨텍스트 조립 결과 */
export interface AssembledContext {
  /** 마크다운 형식 컨텍스트 블록 */
  markdown: string;
  /** 포함된 항목 목록 */
  items: ContextItem[];
  /** 사용된 토큰 추정치 */
  estimatedTokens: number;
  /** 토큰 초과로 제거된 항목 수 */
  truncatedCount: number;
}

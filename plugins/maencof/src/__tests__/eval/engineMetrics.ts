/**
 * @file engineMetrics.ts
 * @description 평가 러너 공유 타입 — macro 지표 묶음과 검색/컨텍스트 함수 시그니처.
 */

export interface EngineMetrics {
  ndcg10: number;
  recall10: number;
  mrr: number;
  precisionR: number;
}

/** seeds → 상위 문서 경로 목록을 반환하는 검색 함수 */
export type SearchFn = (seeds: string[]) => string[];

/** 자연어 query → 상위 문서 경로 목록을 반환하는 컨텍스트 함수 */
export type ContextFn = (rawQuery: string) => string[];

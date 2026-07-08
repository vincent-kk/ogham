/**
 * @file evalRunner.ts
 * @description 골든셋 평가 공용 러너 — 라이브 kg_search 기본 파라미터, macro 지표 집계.
 * searchQuality(ratchet) / crossEngine(아카이브 대조) / paramSweep(수렴) 세 러너가 공유한다.
 */
import type { QueryOptions } from '../../search/queryEngine/index.js';
import { query } from '../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import { GOLDEN_QUERIES } from './goldenSet.js';
import { mrr, ndcgAt, recallAt } from './rankingMetrics.js';

export const K = 10;

/** kg_search 기본 파라미터 고정 (라이브 MCP 경로 동일 조건) */
export const LIVE_DEFAULTS: QueryOptions = {
  maxResults: K,
  decay: 0.7,
  threshold: 0.1,
  maxHops: 5,
};

export interface EngineMetrics {
  ndcg10: number;
  recall10: number;
  mrr: number;
}

/** seeds → 상위 문서 경로 목록을 반환하는 검색 함수 */
export type SearchFn = (seeds: string[]) => string[];

export function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/** 임의 검색 함수에 대한 골든셋 macro-average 지표 */
export function measureSearchFn(searchFn: SearchFn): EngineMetrics {
  let ndcgSum = 0;
  let recallSum = 0;
  let mrrSum = 0;
  for (const gq of GOLDEN_QUERIES) {
    const ranked = searchFn(gq.seeds);
    ndcgSum += ndcgAt(K, ranked, gq.relevance);
    recallSum += recallAt(K, ranked, gq.relevance);
    mrrSum += mrr(ranked, gq.relevance);
  }
  const n = GOLDEN_QUERIES.length;
  return {
    ndcg10: round4(ndcgSum / n),
    recall10: round4(recallSum / n),
    mrr: round4(mrrSum / n),
  };
}

/** 라이브 QGA-SA 엔진의 검색 함수 (src query() 경유) */
export function liveSearchFn(
  graph: KnowledgeGraph,
  options: QueryOptions = LIVE_DEFAULTS,
): SearchFn {
  return (seeds) => {
    const { results } = query(graph, seeds, options);
    return results.map(
      (r) => graph.nodes.get(r.nodeId)?.path ?? String(r.nodeId),
    );
  };
}

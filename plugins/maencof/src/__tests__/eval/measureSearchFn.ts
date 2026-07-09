/**
 * @file measureSearchFn.ts
 * @description 임의 검색 함수에 대한 골든셋(goldenSet) macro-average 지표.
 */
import type { EngineMetrics, SearchFn } from './engineMetrics.js';
import { GOLDEN_QUERIES } from './goldenSet.js';
import { measureRankings } from './measureRankings.js';

export function measureSearchFn(searchFn: SearchFn): EngineMetrics {
  return measureRankings(
    GOLDEN_QUERIES.map((gq) => ({
      ranked: searchFn(gq.seeds),
      relevance: gq.relevance,
    })),
  );
}

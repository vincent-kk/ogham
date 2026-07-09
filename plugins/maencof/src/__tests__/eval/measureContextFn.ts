/**
 * @file measureContextFn.ts
 * @description 임의 컨텍스트 함수에 대한 컨텍스트 골든셋 macro-average 지표.
 */
import type { ContextGoldenQuery } from './contextGoldenSet.js';
import type { ContextFn, EngineMetrics } from './engineMetrics.js';
import { measureRankings } from './measureRankings.js';

export function measureContextFn(
  contextFn: ContextFn,
  queries: ContextGoldenQuery[],
): EngineMetrics {
  return measureRankings(
    queries.map((gq) => ({
      ranked: contextFn(gq.query),
      relevance: gq.relevance,
    })),
  );
}

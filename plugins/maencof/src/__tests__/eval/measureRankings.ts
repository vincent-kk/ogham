/**
 * @file measureRankings.ts
 * @description (ranked, relevance) 쌍 목록의 macro-average 지표 집계 —
 * 검색/컨텍스트 러너가 공유하는 단일 집계 경로.
 */
import type { EngineMetrics } from './engineMetrics.js';
import { K } from './evalConstants.js';
import { mrr } from './mrr.js';
import { ndcgAt } from './ndcgAt.js';
import { precisionAtR } from './precisionAtR.js';
import { recallAt } from './recallAt.js';

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function measureRankings(
  rankings: Array<{ ranked: string[]; relevance: Record<string, number> }>,
): EngineMetrics {
  let ndcgSum = 0;
  let recallSum = 0;
  let mrrSum = 0;
  let precisionSum = 0;
  for (const { ranked, relevance } of rankings) {
    ndcgSum += ndcgAt(K, ranked, relevance);
    recallSum += recallAt(K, ranked, relevance);
    mrrSum += mrr(ranked, relevance);
    precisionSum += precisionAtR(ranked, relevance);
  }
  const n = rankings.length;
  return {
    ndcg10: round4(ndcgSum / n),
    recall10: round4(recallSum / n),
    mrr: round4(mrrSum / n),
    precisionR: round4(precisionSum / n),
  };
}

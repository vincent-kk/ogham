/**
 * @file searchQuality.eval.test.ts
 * @description 골든셋 검색 품질 회귀 게이트 — ratchet baseline 대비 nDCG@10/Recall@10/MRR.
 *
 * 운영 규칙(설계서 03장): baseline 미달 시 실패. 지표 개선 시
 * `MAENCOF_EVAL_UPDATE_BASELINE=1 yarn test:run` 으로 baseline을 재기록해 같은 커밋에 포함한다.
 * 쿼리 파라미터는 kg_search 기본값(maxHops 5, threshold 0.1, decay 0.7)을 고정해
 * 라이브 MCP 경로와 동일 조건으로 측정한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { QueryOptions } from '../../search/queryEngine/index.js';
import { query } from '../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import { buildEvalGraph } from './fixtureVault.js';
import { GOLDEN_QUERIES } from './goldenSet.js';
import { mrr, ndcgAt, recallAt } from './rankingMetrics.js';

const BASELINE_URL = new URL('./baseline.json', import.meta.url);
const RATCHET_EPSILON = 0.005;
const K = 10;

/** kg_search 기본 파라미터 고정 (라이브 경로 동일 조건) */
const LIVE_DEFAULTS: QueryOptions = {
  maxResults: K,
  decay: 0.7,
  threshold: 0.1,
  maxHops: 5,
};

interface EngineMetrics {
  ndcg10: number;
  recall10: number;
  mrr: number;
}

interface Baseline {
  queries: number;
  engines: Record<string, EngineMetrics>;
}

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_URL, 'utf8')) as Baseline;
}

function resultPaths(
  graph: KnowledgeGraph,
  seeds: string[],
  options: QueryOptions,
): string[] {
  const { results } = query(graph, seeds, options);
  return results.map(
    (r) => graph.nodes.get(r.nodeId)?.path ?? String(r.nodeId),
  );
}

/** 골든셋 전체에 대한 macro-average 지표 */
function measureEngine(
  graph: KnowledgeGraph,
  options: QueryOptions,
): EngineMetrics {
  let ndcgSum = 0;
  let recallSum = 0;
  let mrrSum = 0;
  for (const gq of GOLDEN_QUERIES) {
    const ranked = resultPaths(graph, gq.seeds, options);
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

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function assertMeetsBaseline(
  engineKey: string,
  measured: EngineMetrics,
  baseline: Baseline,
): void {
  const base = baseline.engines[engineKey];
  if (process.env.MAENCOF_EVAL_UPDATE_BASELINE === '1') {
    baseline.engines[engineKey] = measured;
    baseline.queries = GOLDEN_QUERIES.length;
    writeFileSync(BASELINE_URL, `${JSON.stringify(baseline, null, 2)}\n`);
    return;
  }
  if (!base) return;

  expect(measured.ndcg10, `${engineKey} nDCG@10`).toBeGreaterThanOrEqual(
    base.ndcg10 - RATCHET_EPSILON,
  );
  expect(measured.recall10, `${engineKey} Recall@10`).toBeGreaterThanOrEqual(
    base.recall10 - RATCHET_EPSILON,
  );
  expect(measured.mrr, `${engineKey} MRR`).toBeGreaterThanOrEqual(
    base.mrr - RATCHET_EPSILON,
  );
}

describe('search quality golden set', () => {
  const graph = buildEvalGraph();

  it('every golden query returns at least one result', () => {
    for (const gq of GOLDEN_QUERIES) {
      const ranked = resultPaths(graph, gq.seeds, LIVE_DEFAULTS);
      expect(ranked.length, `query ${gq.id}`).toBeGreaterThan(0);
    }
  });

  it('legacy engine meets ratchet baseline', () => {
    const measured = measureEngine(graph, {
      ...LIVE_DEFAULTS,
      engine: 'legacy',
    });

    console.log('[eval] legacy:', JSON.stringify(measured));
    assertMeetsBaseline('legacy', measured, loadBaseline());
  });

  it('qga engine meets ratchet baseline', () => {
    const measured = measureEngine(graph, { ...LIVE_DEFAULTS, engine: 'qga' });

    console.log('[eval] qga:', JSON.stringify(measured));
    assertMeetsBaseline('qga', measured, loadBaseline());
  });
});

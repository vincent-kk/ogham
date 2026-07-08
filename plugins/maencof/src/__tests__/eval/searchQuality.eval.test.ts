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

import type { EngineMetrics } from './evalRunner.js';
import { LIVE_DEFAULTS, liveSearchFn, measureSearchFn } from './evalRunner.js';
import { buildEvalGraph } from './fixtureVault.js';
import { GOLDEN_QUERIES } from './goldenSet.js';

const BASELINE_URL = new URL('./baseline.json', import.meta.url);
const RATCHET_EPSILON = 0.005;

interface Baseline {
  queries: number;
  engines: Record<string, EngineMetrics>;
}

function loadBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_URL, 'utf8')) as Baseline;
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
  const searchFn = liveSearchFn(graph, LIVE_DEFAULTS);

  it('every golden query returns at least one result', () => {
    for (const gq of GOLDEN_QUERIES)
      expect(searchFn(gq.seeds).length, `query ${gq.id}`).toBeGreaterThan(0);
  });

  it('qga engine meets ratchet baseline', () => {
    const measured = measureSearchFn(searchFn);

    console.log('[eval] qga:', JSON.stringify(measured));
    assertMeetsBaseline('qga', measured, loadBaseline());
  });
});

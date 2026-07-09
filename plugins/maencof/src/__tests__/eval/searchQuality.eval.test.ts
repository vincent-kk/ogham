/**
 * @file searchQuality.eval.test.ts
 * @description 골든셋 검색 품질 회귀 게이트 — ratchet baseline 대비 nDCG@10/Recall@10/MRR/R-precision.
 *
 * 운영 규칙(설계서 03장): baseline 미달 시 실패. 지표 개선 시
 * `MAENCOF_EVAL_UPDATE_BASELINE=1 yarn test:run` 으로 baseline을 재기록해 같은 커밋에 포함한다
 * (동일 골든셋에서의 하향 재기록은 ratchet.ts 기술 게이트가 거부한다).
 * 쿼리 파라미터는 kg_search 기본값(maxHops 5, threshold 0.1, decay 0.7)을 고정해
 * 라이브 MCP 경로와 동일 조건으로 측정한다.
 */
import { describe, expect, it } from 'vitest';

import { LIVE_DEFAULTS } from './evalConstants.js';
import { buildEvalGraph } from './fixtureVault.js';
import { GOLDEN_QUERIES } from './goldenSet.js';
import { liveSearchFn } from './liveSearchFn.js';
import { measureSearchFn } from './measureSearchFn.js';
import { assertMeetsBaseline } from './ratchet.js';

const BASELINE_URL = new URL('./baseline.json', import.meta.url);

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
    assertMeetsBaseline(BASELINE_URL, 'qga', measured, GOLDEN_QUERIES.length);
  });
});

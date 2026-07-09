/**
 * @file contextQuality.eval.test.ts
 * @description kg_context 파이프라인 품질 회귀 게이트 — 자연어 원문 query 가 핸들러와
 * 동일한 분해·검색·조립 경로(liveContextFn)를 통과한 결과를 contextBaseline.json
 * ratchet 으로 감시한다. 동형이의어 상위 오염은 명시 단언으로 별도 고정한다.
 */
import { describe, expect, it } from 'vitest';

import { CONTEXT_GOLDEN_QUERIES } from './contextGoldenSet.js';
import { buildEvalGraph } from './fixtureVault.js';
import { liveContextFn } from './liveContextFn.js';
import { measureContextFn } from './measureContextFn.js';
import { assertMeetsBaseline } from './ratchet.js';

const CONTEXT_BASELINE_URL = new URL('./contextBaseline.json', import.meta.url);

describe('context quality golden set (kg_context pipeline)', () => {
  const graph = buildEvalGraph();
  const contextFn = liveContextFn(graph);

  it('every context golden query returns at least one document', () => {
    for (const gq of CONTEXT_GOLDEN_QUERIES)
      expect(contextFn(gq.query).length, `query ${gq.id}`).toBeGreaterThan(0);
  });

  it('homograph queries rank the qualified domain first', () => {
    const dockerRanked = contextFn('docker image optimization');
    expect(
      dockerRanked[0],
      'common token "image" must not pull the graphics cluster above the docker document',
    ).toBe('L2/insights/docker-image-optimization.md');

    const koreanRanked = contextFn('n3r 전환 계획');
    expect(
      koreanRanked[0],
      'common token "전환" must not pull UI/finance documents above the n3r plan',
    ).toBe('L2/insights/n3r-migration-plan.md');
  });

  it('qga-context meets ratchet baseline', () => {
    const measured = measureContextFn(contextFn, CONTEXT_GOLDEN_QUERIES);

    console.log('[eval] qga-context:', JSON.stringify(measured));
    assertMeetsBaseline(
      CONTEXT_BASELINE_URL,
      'qga-context',
      measured,
      CONTEXT_GOLDEN_QUERIES.length,
    );
  });
});

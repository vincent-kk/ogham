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

import { query } from '../../search/queryEngine/index.js';

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

// 개발요청서(maencof-seed-resolution) 수용 기준의 fixture 사상 — 응답 형태 회귀.
describe('seed resolution regression', () => {
  const graph = buildEvalGraph();

  it('AND-failed phrase reports itself unresolved', () => {
    const r = query(graph, ['주간보고 작성 규칙']);
    expect(r.results).toHaveLength(0);
    expect(r.exploredNodes).toBe(0);
    expect(r.seedCounts['주간보고 작성 규칙']).toBe(0);
  });

  it('resolved seeds carry counts even on full success', () => {
    const r = query(graph, ['주간보고', '루틴']);
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.seedCounts['주간보고']).toBeGreaterThan(0);
    expect(r.seedCounts['루틴']).toBeGreaterThan(0);
  });

  it('partial failure marks only dead seeds', () => {
    const r = query(graph, ['knowledge graph', 'wxyzq']);
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.seedCounts['knowledge graph']).toBeGreaterThan(0);
    expect(r.seedCounts['wxyzq']).toBe(0);
  });

  it('kebab seed matches verbatim tag holders first', () => {
    const r = query(graph, ['weekly-report']);
    expect(r.results.length).toBeGreaterThan(0);
    const top = String(r.results[0]!.nodeId);
    expect(top.startsWith('L4/routines/weekly-report-')).toBe(true);
    expect(r.seedCounts['weekly-report']).toBe(2);
  });
});

// R8 수용 기준 사상 — 지목 승격(기준 1·4)과 주제어 승계 보존(기준 2).
describe('cluster seed designation (R8)', () => {
  const graph = buildEvalGraph();

  it('identifier seed promotes its folded old member to top-1', () => {
    const r = query(graph, ['update-03'], LIVE_DEFAULTS);
    expect(String(r.results[0]!.nodeId)).toBe('L4/works/gcc-3903-update-03.md');
    expect(r.results[0]!.clusterKey).toBe('jira-gcc-3903');
  });

  it('topic seed keeps digest succession', () => {
    const r = query(graph, ['jira'], LIVE_DEFAULTS);
    expect(String(r.results[0]!.nodeId)).toBe('L4/works/gcc-3903-digest.md');
  });
});

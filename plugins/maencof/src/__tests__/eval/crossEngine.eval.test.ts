/**
 * @file crossEngine.eval.test.ts
 * @description 교차 엔진 벤치마크 — 아카이브 v1 격리본 vs 라이브 QGA-SA를 동일한
 * 라이브 픽스처·골든셋 위에서 나란히 측정한다 (세대 간 비교의 정본 러너).
 *
 * v1은 .metadata 아카이브의 runtime 이식본(전체 legacy 파이프라인: 시드 해석+적응형+
 * max-전파 SA)을 동적 import로 실행한다 — 아카이브는 동결 원칙에 따라 수정하지 않고
 * 소비만 한다. 골든셋이 성장하면 두 엔진 모두 새 분모에서 재측정된다(아카이브 내부의
 * 동결 기준선은 이식 충실도 증명용으로 별도 유지).
 */
import { describe, expect, it } from 'vitest';

import type { EngineMetrics, SearchFn } from './engineMetrics.js';
import { LIVE_DEFAULTS } from './evalConstants.js';
import { buildEvalGraph } from './fixtureVault.js';
import { liveSearchFn } from './liveSearchFn.js';
import { measureSearchFn } from './measureSearchFn.js';

const ARCHIVE_PIPELINE_URL = new URL(
  '../../../../../.metadata/maencof/TOOL/Spreading-Activation-Engine-Archive/v1-bfs-max-propagation/runtime/queryPipeline.mjs',
  import.meta.url,
);

interface ArchivedPipeline {
  query: (
    graph: unknown,
    seeds: string[],
    options: Record<string, unknown>,
  ) => { results: Array<{ nodeId: string }> };
}

async function loadArchivedPipeline(): Promise<ArchivedPipeline> {
  return (await import(ARCHIVE_PIPELINE_URL.href)) as ArchivedPipeline;
}

function formatRow(name: string, m: EngineMetrics): string {
  return `${name.padEnd(14)} ndcg10 ${m.ndcg10.toFixed(4)}  recall10 ${m.recall10.toFixed(4)}  mrr ${m.mrr.toFixed(4)}  precR ${m.precisionR.toFixed(4)}`;
}

describe('cross-engine benchmark (archived v1 vs live qga)', () => {
  it('compares both engines on the live golden set', async () => {
    const graph = buildEvalGraph();
    const archived = await loadArchivedPipeline();

    const archivedSearchFn: SearchFn = (seeds) => {
      const { results } = archived.query(graph, seeds, { ...LIVE_DEFAULTS });
      return results.map(
        (r) => graph.nodes.get(r.nodeId as never)?.path ?? r.nodeId,
      );
    };

    const v1 = measureSearchFn(archivedSearchFn);
    const live = measureSearchFn(liveSearchFn(graph, LIVE_DEFAULTS));

    console.log('[eval:cross] ' + formatRow('v1(archive)', v1));
    console.log('[eval:cross] ' + formatRow('qga(live)', live));
    console.log(
      `[eval:cross] delta        ndcg10 ${(live.ndcg10 - v1.ndcg10).toFixed(4)}  recall10 ${(live.recall10 - v1.recall10).toFixed(4)}  mrr ${(live.mrr - v1.mrr).toFixed(4)}`,
    );
    if (live.ndcg10 < v1.ndcg10)
      console.warn(
        '[eval:cross] WARNING: live engine below archived v1 on nDCG@10 — investigate before ratchet update',
      );

    // 두 엔진 모두 유효 측정이어야 한다 (비교 자체의 무결성 게이트)
    for (const m of [v1, live]) {
      expect(m.ndcg10).toBeGreaterThan(0);
      expect(m.recall10).toBeGreaterThan(0);
      expect(Number.isFinite(m.mrr)).toBe(true);
    }
  });
});

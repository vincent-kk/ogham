/**
 * @file decaySweep.eval.test.ts
 * @description 감쇠 인자 수렴 러너 — L5·hub·CROSS_LAYER 계수를 골든셋 위에서 전수 측정한다.
 *
 * 이 세 계수는 v2 에서 의미가 뒤집힌 채로 있었고(설계는 감쇠량, 구현은 곱셈 계수),
 * v3 재조정 시점의 골든셋은 L5·허브 문서를 하나도 담고 있지 않아 값을 바꿔도 지표가
 * 움직이지 않았다. fixtureVault 의 허브 2종·L5 4종이 그 발화 경로를 만들고,
 * 이 러너가 값을 계측으로 뒷받침한다.
 *
 * 계수 주입은 전부 모듈 경계에서 한다 — 확산 엔진이 `getLayerDecay` 와
 * `EDGE_TYPE_MULTIPLIER` 를 모듈에서 직접 읽으므로, 운영 타입에 스윕용 파라미터를
 * 열지 않고 측정 동안만 갈아끼운다. 이 결합이 끊기면(엔진이 다른 경로로 감쇠를
 * 읽게 되면) 아래 "스윕 무결성" 단언이 잡는다.
 *
 * 수렴 루프: 골든셋에 사례 추가 → 본 스윕 실행 → 상위 조합이 기본값을 유의미하게
 * (≥ SWEEP_SIGNIFICANCE) 앞서면 constants/weights.ts · constants/spreadingActivation.ts
 * 승격 → `MAENCOF_EVAL_UPDATE_BASELINE=1` 로 ratchet 재기록 → 같은 커밋.
 * 상세 리포트는 `MAENCOF_EVAL_DECAY_SWEEP_REPORT=<path>` 지정 시 JSON 으로 기록한다.
 */
import { writeFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { EDGE_TYPE_MULTIPLIER } from '../../constants/spreadingActivation.js';
import {
  HUB_DECAY_FACTOR,
  LAYER_DECAY_FACTORS,
  SUBLAYER_DECAY_FACTORS,
} from '../../constants/weights.js';
import { Layer } from '../../types/common.js';
import type { EdgeType, SubLayer } from '../../types/common.js';

import type { EngineMetrics } from './engineMetrics.js';
import { LIVE_DEFAULTS } from './evalConstants.js';
import { buildEvalGraph } from './fixtureVault.js';
import { liveSearchFn } from './liveSearchFn.js';
import { measureSearchFn } from './measureSearchFn.js';

interface DecayCandidate {
  l5: number;
  hub: number;
  crossLayer: number;
}

/**
 * 측정 중인 후보. `vi.mock` 팩토리는 호이스팅되므로 이 변수를 읽기만 하고,
 * 실제 값은 스윕 루프가 조합마다 갈아끼운다. null 이면 원본 동작.
 */
let activeCandidate: DecayCandidate | null = null;

// 확산 엔진이 읽는 배럴을 갈아끼운다. `getLayerDecay` 만 후보 값을 반영하고
// 나머지 export(calculateWeights 등, 픽스처 그래프 구축이 쓴다)는 원본이 지나간다.
vi.mock('../../core/weightCalculator/index.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../core/weightCalculator/index.js')
    >();
  return {
    ...actual,
    getLayerDecay: (
      layer: Layer,
      subLayer?: SubLayer,
      hub?: boolean,
    ): number => {
      const candidate = activeCandidate;
      if (!candidate) return actual.getLayerDecay(layer, subLayer, hub);
      if (hub) return candidate.hub;
      if (subLayer && subLayer in SUBLAYER_DECAY_FACTORS)
        return SUBLAYER_DECAY_FACTORS[subLayer];
      if (layer === Layer.L5_CONTEXT) return candidate.l5;
      return LAYER_DECAY_FACTORS[layer] ?? 0.7;
    },
  };
});

/** 스윕 축 — 현행 기본값을 반드시 포함해야 기본값 순위 비교가 성립한다 */
const GRID = {
  /** L5(임시 수용소)의 격리 강도 */
  l5: [0.25, 0.35, 0.45, 0.55, 0.6, 0.7, 0.8, 0.95],
  /** 허브의 확산 강도 */
  hub: [0.5, 0.6, 0.75, 0.85, 0.95, 1.0],
  /** CROSS_LAYER 엣지의 전달 강도 */
  crossLayer: [0.2, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.85, 1.0],
} as const;

const DEFAULTS: DecayCandidate = {
  l5: LAYER_DECAY_FACTORS[Layer.L5_CONTEXT],
  hub: HUB_DECAY_FACTOR,
  crossLayer: EDGE_TYPE_MULTIPLIER.CROSS_LAYER,
};

/** 기본값 대비 이 이상 nDCG가 앞서야 승격 후보로 보고 */
const SWEEP_SIGNIFICANCE = 0.005;

interface SweepEntry {
  candidate: DecayCandidate;
  metrics: EngineMetrics;
}

/**
 * 후보 값을 적용한 상태로 한 번 측정한다.
 *
 * `EDGE_TYPE_MULTIPLIER` 도 엔진이 모듈에서 직접 읽으므로 같은 방식으로 갈아끼우고,
 * 쿼리 캐시는 비운다 — 캐시 키는 seeds + 옵션이라 모듈 상태 변화를 보지 못한다.
 *
 * @param candidate - 측정할 감쇠 계수 조합
 * @param graph - 평가용 그래프 (조합과 무관하게 재사용)
 * @returns 골든셋 macro-average 지표
 */
async function measureCandidate(
  candidate: DecayCandidate,
  graph: ReturnType<typeof buildEvalGraph>,
): Promise<EngineMetrics> {
  const { invalidateQueryCache } = await import(
    '../../search/queryEngine/index.js'
  );
  const table = EDGE_TYPE_MULTIPLIER as Record<EdgeType, number>;
  const previousMultiplier = table.CROSS_LAYER;

  activeCandidate = candidate;
  table.CROSS_LAYER = candidate.crossLayer;
  invalidateQueryCache();
  try {
    return measureSearchFn(liveSearchFn(graph, LIVE_DEFAULTS));
  } finally {
    activeCandidate = null;
    table.CROSS_LAYER = previousMultiplier;
    invalidateQueryCache();
  }
}

function* gridCombos(): Generator<DecayCandidate> {
  for (const l5 of GRID.l5)
    for (const hub of GRID.hub)
      for (const crossLayer of GRID.crossLayer) yield { l5, hub, crossLayer };
}

function rankKey(m: EngineMetrics): number {
  return m.ndcg10 * 1e8 + m.recall10 * 1e4 + m.precisionR;
}

function same(a: DecayCandidate, b: DecayCandidate): boolean {
  return a.l5 === b.l5 && a.hub === b.hub && a.crossLayer === b.crossLayer;
}

function format({ candidate: c, metrics: m }: SweepEntry): string {
  return `L5=${c.l5} hub=${c.hub} xlayer=${c.crossLayer} → ndcg10 ${m.ndcg10.toFixed(4)} recall10 ${m.recall10.toFixed(4)} mrr ${m.mrr.toFixed(4)} precR ${m.precisionR.toFixed(4)}`;
}

describe('decay factor sweep (L5 / hub / CROSS_LAYER convergence)', () => {
  it(
    'grid-sweeps decay factors and reports best vs current defaults',
    { timeout: 300_000 },
    async () => {
      const graph = buildEvalGraph();

      const entries: SweepEntry[] = [];
      for (const candidate of gridCombos())
        entries.push({
          candidate,
          metrics: await measureCandidate(candidate, graph),
        });

      // 스윕 무결성: 축마다 따로 확인한다. 전체 평탄성만 보면 한 축(CROSS_LAYER)이
      // 살아 있는 것만으로 통과해 나머지 두 축이 죽은 걸 놓친다 — 모듈 스파이가
      // 엔진에서 떨어지거나 캐시가 결과를 고정하면 해당 축이 먼저 평탄해진다.
      for (const axis of ['l5', 'hub', 'crossLayer'] as const) {
        const slice = entries.filter((e) =>
          (['l5', 'hub', 'crossLayer'] as const)
            .filter((other) => other !== axis)
            .every((other) => e.candidate[other] === DEFAULTS[other]),
        );
        expect(
          new Set(slice.map((e) => e.metrics.ndcg10)).size,
          `${axis} axis produced a single ndcg value across ${slice.length} points — that coefficient is not reaching the engine (module spy detached, or a stale query cache)`,
        ).toBeGreaterThan(1);
      }

      entries.sort((a, b) => rankKey(b.metrics) - rankKey(a.metrics));

      const defaultEntry = entries.find((e) => same(e.candidate, DEFAULTS));
      expect(defaultEntry, 'grid must contain current defaults').toBeDefined();
      const defaultRank = entries.indexOf(defaultEntry!) + 1;
      const best = entries[0]!;

      console.log(
        `[eval:decay] configs ${entries.length}, current defaults rank ${defaultRank}/${entries.length}`,
      );
      console.log(`[eval:decay] default  ${format(defaultEntry!)}`);
      for (const [i, entry] of entries.slice(0, 5).entries())
        console.log(`[eval:decay] top-${i + 1}    ${format(entry)}`);

      const gain = best.metrics.ndcg10 - defaultEntry!.metrics.ndcg10;
      if (gain >= SWEEP_SIGNIFICANCE && !same(best.candidate, DEFAULTS))
        console.warn(
          `[eval:decay] PROMOTION CANDIDATE: best beats defaults by ndcg10 +${gain.toFixed(4)} — consider updating constants/weights.ts and constants/spreadingActivation.ts, then re-recording the ratchet baseline`,
        );

      const reportPath = process.env.MAENCOF_EVAL_DECAY_SWEEP_REPORT;
      if (reportPath)
        writeFileSync(
          reportPath,
          `${JSON.stringify({ defaults: defaultEntry, defaultRank, entries }, null, 2)}\n`,
        );

      // 수렴 무결성: 기본 조합이 그리드에 포함되므로 최적은 기본보다 나쁠 수 없다
      expect(rankKey(best.metrics)).toBeGreaterThanOrEqual(
        rankKey(defaultEntry!.metrics),
      );
    },
  );
});

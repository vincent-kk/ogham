/**
 * @file paramSweep.eval.test.ts
 * @description QGA-SA 매직넘버 수렴 러너 — 파라미터 그리드를 골든셋 위에서 전수 측정해
 * 현행 기본값과 최적 조합의 격차를 매 실행 보고한다.
 *
 * 수렴 루프(설계서 03장): 골든셋에 사례 추가 → 본 스윕 실행 → 상위 조합이 기본값을
 * 유의미하게(≥ SWEEP_SIGNIFICANCE) 앞서면 constants/spreadingActivation.ts 승격 →
 * `MAENCOF_EVAL_UPDATE_BASELINE=1` 로 ratchet 재기록 → 같은 커밋. 상세 리포트는
 * `MAENCOF_EVAL_SWEEP_REPORT=<path>` 지정 시 JSON으로 기록한다(기본은 콘솔 요약만).
 */
import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  QGA_GATE_FLOOR,
  QGA_ITERATIONS,
  QGA_UPDATE_THRESHOLD,
} from '../../constants/spreadingActivation.js';
import type { QgaTuning } from '../../search/queryEngine/index.js';

import type { EngineMetrics } from './evalRunner.js';
import { LIVE_DEFAULTS, liveSearchFn, measureSearchFn } from './evalRunner.js';
import { buildEvalGraph } from './fixtureVault.js';

/** 그리드 축 — 기본값을 반드시 포함해야 기본값 순위 비교가 성립한다 */
const GRID: Record<keyof QgaTuning, number[]> = {
  iterations: [2, 3, 4],
  updateThreshold: [0.005, 0.01, 0.02],
  gateFloor: [0.15, 0.3, 0.5],
  alphaBase: [0.85, 1.0],
};

const DEFAULT_TUNING: Required<QgaTuning> = {
  iterations: QGA_ITERATIONS,
  updateThreshold: QGA_UPDATE_THRESHOLD,
  gateFloor: QGA_GATE_FLOOR,
  alphaBase: 1.0,
};

/** 기본값 대비 이 이상 nDCG가 앞서야 승격 후보로 보고 */
const SWEEP_SIGNIFICANCE = 0.005;

interface SweepEntry {
  tuning: Required<QgaTuning>;
  metrics: EngineMetrics;
}

function* gridCombos(): Generator<Required<QgaTuning>> {
  for (const iterations of GRID.iterations)
    for (const updateThreshold of GRID.updateThreshold)
      for (const gateFloor of GRID.gateFloor)
        for (const alphaBase of GRID.alphaBase)
          yield { iterations, updateThreshold, gateFloor, alphaBase };
}

function rankKey(m: EngineMetrics): number {
  return m.ndcg10 * 1e8 + m.recall10 * 1e4 + m.mrr;
}

function sameTuning(a: Required<QgaTuning>, b: Required<QgaTuning>): boolean {
  return (
    a.iterations === b.iterations &&
    a.updateThreshold === b.updateThreshold &&
    a.gateFloor === b.gateFloor &&
    a.alphaBase === b.alphaBase
  );
}

function formatEntry(entry: SweepEntry): string {
  const { tuning: t, metrics: m } = entry;
  return `T=${t.iterations} τ=${t.updateThreshold} γ=${t.gateFloor} α=${t.alphaBase} → ndcg10 ${m.ndcg10.toFixed(4)} recall10 ${m.recall10.toFixed(4)} mrr ${m.mrr.toFixed(4)}`;
}

describe('QGA-SA parameter sweep (magic-number convergence)', () => {
  it('grid-sweeps tuning parameters and reports best vs current defaults', () => {
    const graph = buildEvalGraph();

    const entries: SweepEntry[] = [];
    for (const tuning of gridCombos())
      entries.push({
        tuning,
        metrics: measureSearchFn(
          liveSearchFn(graph, { ...LIVE_DEFAULTS, tuning }),
        ),
      });

    entries.sort((a, b) => rankKey(b.metrics) - rankKey(a.metrics));

    const defaultEntry = entries.find((e) => sameTuning(e.tuning, DEFAULT_TUNING));
    expect(defaultEntry, 'grid must contain current defaults').toBeDefined();
    const defaultRank = entries.indexOf(defaultEntry!) + 1;
    const best = entries[0]!;

    console.log(
      `[eval:sweep] configs ${entries.length}, current defaults rank ${defaultRank}/${entries.length}`,
    );
    console.log(`[eval:sweep] default  ${formatEntry(defaultEntry!)}`);
    for (const [i, entry] of entries.slice(0, 3).entries())
      console.log(`[eval:sweep] top-${i + 1}    ${formatEntry(entry)}`);

    const gain = best.metrics.ndcg10 - defaultEntry!.metrics.ndcg10;
    if (gain >= SWEEP_SIGNIFICANCE && !sameTuning(best.tuning, DEFAULT_TUNING))
      console.warn(
        `[eval:sweep] PROMOTION CANDIDATE: best beats defaults by ndcg10 +${gain.toFixed(4)} — consider updating constants/spreadingActivation.ts and re-recording the ratchet baseline`,
      );

    const reportPath = process.env.MAENCOF_EVAL_SWEEP_REPORT;
    if (reportPath)
      writeFileSync(
        reportPath,
        `${JSON.stringify({ defaults: defaultEntry, defaultRank, entries }, null, 2)}\n`,
      );

    // 수렴 무결성: 최적 조합은 기본 조합보다 나쁠 수 없다 (기본값이 그리드에 포함되므로)
    expect(rankKey(best.metrics)).toBeGreaterThanOrEqual(
      rankKey(defaultEntry!.metrics),
    );
  });
});

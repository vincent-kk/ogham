/**
 * @file compoundScoreSweep.eval.test.ts
 * @description COMPOUND_OR_MATCH_SCORE 수렴 러너 — compound 시드 OR 폴백의 저득점을
 * 골든셋 위에서 전수 측정한다.
 *
 * 주입은 `QgaTuning.compoundOrScore` 오버라이드(캐시 키 포함)로 하므로 decaySweep 과
 * 달리 모듈 스파이가 필요 없다. 폴백 경로는 원형 미명중 + 분해 AND 공집합일 때만
 * 발화하므로(골든 `compound-fallback-or`), 다른 쿼리의 지표는 축 값과 무관하다 —
 * 축이 평탄하면 그 자체가 "현행 골든셋에는 값을 움직일 증거가 없다"는 판정이고,
 * 그때는 현행 0.3 을 유지한다.
 *
 * 수렴 루프: 상위 값이 기본값을 유의미하게(≥ SWEEP_SIGNIFICANCE) 앞서면
 * constants/queryEngine.ts 의 COMPOUND_OR_MATCH_SCORE 승격 →
 * `MAENCOF_EVAL_UPDATE_BASELINE=1` 로 ratchet 재기록 → 같은 커밋.
 * 상세 리포트는 `MAENCOF_EVAL_COMPOUND_SWEEP_REPORT=<path>` 지정 시 JSON 으로 기록한다.
 */
import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { COMPOUND_OR_MATCH_SCORE } from '../../constants/queryEngine.js';
import { query } from '../../search/queryEngine/index.js';

import type { EngineMetrics } from './engineMetrics.js';
import { LIVE_DEFAULTS } from './evalConstants.js';
import { buildEvalGraph } from './fixtureVault.js';
import { liveSearchFn } from './liveSearchFn.js';
import { measureSearchFn } from './measureSearchFn.js';

/** 스윕 축 — 현행 기본값(0.3)을 반드시 포함. 상한은 tag-exact(0.5) 미만 설계 제약. */
const AXIS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45] as const;

/** 기본값 대비 이 이상 nDCG가 앞서야 승격 후보로 보고 */
const SWEEP_SIGNIFICANCE = 0.005;

describe('compound OR fallback score sweep', () => {
  it('sweeps compoundOrScore and reports best vs current default', () => {
    const graph = buildEvalGraph();

    // 스윕 무결성: 오버라이드가 시드 활성으로 실제 전달되는지 — OR 폴백 시드의
    // 활성 점수는 compoundOrScore 에 단조 비례해야 한다 (골든 평탄성과 무관한 검증).
    const low = query(graph, ['routine-checklist'], {
      ...LIVE_DEFAULTS,
      tuning: { compoundOrScore: 0.2 },
    });
    const high = query(graph, ['routine-checklist'], {
      ...LIVE_DEFAULTS,
      tuning: { compoundOrScore: 0.45 },
    });
    expect(low.results.length).toBeGreaterThan(0);
    expect(high.results[0]!.score).toBeGreaterThan(low.results[0]!.score);

    const entries: Array<{ value: number; metrics: EngineMetrics }> = [];
    for (const value of AXIS)
      entries.push({
        value,
        metrics: measureSearchFn(
          liveSearchFn(graph, {
            ...LIVE_DEFAULTS,
            tuning: { compoundOrScore: value },
          }),
        ),
      });

    const defaultEntry = entries.find(
      (e) => e.value === COMPOUND_OR_MATCH_SCORE,
    );
    expect(defaultEntry, 'axis must contain the current default').toBeDefined();

    // 축 관측성: compound-or 가 다른 티어 시드와 경쟁하는 골든
    // (compound-or-vs-prefix-tier)이 있는 한 축은 지표를 움직여야 한다 —
    // 평탄 회귀는 관측점 소실(골든/픽스처 변형)을 뜻한다.
    expect(
      new Set(entries.map((e) => e.metrics.ndcg10)).size,
      'compoundOrScore axis is flat — the competing golden lost its observation point',
    ).toBeGreaterThan(1);

    for (const { value, metrics: m } of entries)
      console.log(
        `[eval:compound] score=${value.toFixed(2)} → ndcg10 ${m.ndcg10.toFixed(4)} recall10 ${m.recall10.toFixed(4)} mrr ${m.mrr.toFixed(4)} precR ${m.precisionR.toFixed(4)}`,
      );

    const best = [...entries].sort(
      (a, b) => b.metrics.ndcg10 - a.metrics.ndcg10,
    )[0]!;
    const gain = best.metrics.ndcg10 - defaultEntry!.metrics.ndcg10;
    if (gain >= SWEEP_SIGNIFICANCE && best.value !== COMPOUND_OR_MATCH_SCORE)
      console.warn(
        `[eval:compound] PROMOTION CANDIDATE: score=${best.value} beats default by ndcg10 +${gain.toFixed(4)} — consider updating COMPOUND_OR_MATCH_SCORE, then re-recording the ratchet baseline`,
      );
    else
      console.log(
        `[eval:compound] axis flat or default optimal (gain ${gain.toFixed(4)} < ${SWEEP_SIGNIFICANCE}) — keep ${COMPOUND_OR_MATCH_SCORE}`,
      );

    const reportPath = process.env.MAENCOF_EVAL_COMPOUND_SWEEP_REPORT;
    if (reportPath)
      writeFileSync(
        reportPath,
        `${JSON.stringify({ default: defaultEntry, best, gain, entries }, null, 2)}\n`,
      );

    // 수렴 무결성: 기본값이 축에 포함되므로 최적은 기본보다 나쁠 수 없다
    expect(best.metrics.ndcg10).toBeGreaterThanOrEqual(
      defaultEntry!.metrics.ndcg10,
    );
  });
});

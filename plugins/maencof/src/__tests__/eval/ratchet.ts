/**
 * @file ratchet.ts
 * @description ratchet baseline 회귀 단언 + 기술 게이트가 있는 재기록.
 * searchQuality(baseline.json) / contextQuality(contextBaseline.json) 두 러너가 공유한다.
 *
 * 재기록(`MAENCOF_EVAL_UPDATE_BASELINE=1`)은 동일 골든셋(쿼리 수 불변)에서 지표가
 * baseline 아래로 내려가는 write 를 거부한다 — 하향 ratchet 차단 기술 게이트.
 * 골든셋 성장/축소(쿼리 수 변경)는 분모가 달라 비교 불가이므로 재기록을 허용한다
 * (설계서 03장 케이스 추가 규칙). 의도적 하향은 `MAENCOF_EVAL_UPDATE_BASELINE=force`
 * 로만 가능하다.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { expect } from 'vitest';

import type { EngineMetrics } from './engineMetrics.js';

const RATCHET_EPSILON = 0.005;

const METRIC_KEYS = ['ndcg10', 'recall10', 'mrr', 'precisionR'] as const;

export interface Baseline {
  queries: number;
  engines: Record<string, Partial<EngineMetrics>>;
}

function loadBaseline(baselineUrl: URL): Baseline {
  return JSON.parse(readFileSync(baselineUrl, 'utf8')) as Baseline;
}

/**
 * measured 를 baseline 과 대조한다. 일반 모드에서는 지표별 `≥ base − ε` 회귀 게이트,
 * 재기록 모드에서는 기술 게이트 통과 시에만 baseline 파일을 갱신한다.
 */
export function assertMeetsBaseline(
  baselineUrl: URL,
  engineKey: string,
  measured: EngineMetrics,
  queryCount: number,
): void {
  const baseline = loadBaseline(baselineUrl);
  const base = baseline.engines[engineKey];
  const mode = process.env.MAENCOF_EVAL_UPDATE_BASELINE;

  if (mode === '1' || mode === 'force') {
    if (mode !== 'force' && base && baseline.queries === queryCount)
      for (const key of METRIC_KEYS) {
        const baseValue = base[key];
        if (baseValue === undefined) continue;
        if (measured[key] < baseValue - RATCHET_EPSILON)
          throw new Error(
            `ratchet update rejected: ${engineKey} ${key} ${measured[key]} < baseline ${baseValue} on an unchanged golden set (${queryCount} queries). ` +
              `Fix the regression, or use MAENCOF_EVAL_UPDATE_BASELINE=force for an intentional lowering.`,
          );
      }

    baseline.engines[engineKey] = measured;
    baseline.queries = queryCount;
    writeFileSync(baselineUrl, `${JSON.stringify(baseline, null, 2)}\n`);
    return;
  }

  if (!base) return;
  for (const key of METRIC_KEYS) {
    const baseValue = base[key];
    if (baseValue === undefined) continue;
    expect(measured[key], `${engineKey} ${key}`).toBeGreaterThanOrEqual(
      baseValue - RATCHET_EPSILON,
    );
  }
}

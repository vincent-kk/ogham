/**
 * @file ratchetGate.test.ts
 * @description ratchet 재기록 기술 게이트 — 동일 골든셋 하향 write 거부, 개선 write 허용,
 * 골든셋 성장(쿼리 수 변경) 시 재기록 허용.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EngineMetrics } from '../eval/engineMetrics.js';
import { type Baseline, assertMeetsBaseline } from '../eval/ratchet.js';

const RECORDED: EngineMetrics = {
  ndcg10: 0.9,
  recall10: 0.9,
  mrr: 1,
  precisionR: 0.8,
};

function metrics(overrides: Partial<EngineMetrics>): EngineMetrics {
  return { ...RECORDED, ...overrides };
}

describe('ratchet update technical gate', () => {
  let dir: string;
  let baselineUrl: URL;
  const originalEnv = process.env.MAENCOF_EVAL_UPDATE_BASELINE;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'maencof-ratchet-'));
    baselineUrl = pathToFileURL(join(dir, 'baseline.json'));
    const baseline: Baseline = { queries: 5, engines: { qga: RECORDED } };
    writeFileSync(baselineUrl, `${JSON.stringify(baseline)}\n`);
    process.env.MAENCOF_EVAL_UPDATE_BASELINE = '1';
  });

  afterEach(() => {
    if (originalEnv === undefined)
      delete process.env.MAENCOF_EVAL_UPDATE_BASELINE;
    else process.env.MAENCOF_EVAL_UPDATE_BASELINE = originalEnv;
    rmSync(dir, { recursive: true, force: true });
  });

  function storedNdcg(): number {
    const stored = JSON.parse(readFileSync(baselineUrl, 'utf8')) as Baseline;
    return stored.engines.qga!.ndcg10!;
  }

  it('rejects a lowering rewrite on an unchanged golden set', () => {
    expect(() =>
      assertMeetsBaseline(baselineUrl, 'qga', metrics({ ndcg10: 0.85 }), 5),
    ).toThrow(/ratchet update rejected/);
    expect(storedNdcg()).toBe(0.9);
  });

  it('accepts an improving rewrite on an unchanged golden set', () => {
    assertMeetsBaseline(baselineUrl, 'qga', metrics({ ndcg10: 0.95 }), 5);
    expect(storedNdcg()).toBe(0.95);
  });

  it('allows a rewrite when the golden set size changed (new denominator)', () => {
    assertMeetsBaseline(baselineUrl, 'qga', metrics({ ndcg10: 0.85 }), 7);
    expect(storedNdcg()).toBe(0.85);
  });

  it('force mode bypasses the gate for an intentional lowering', () => {
    process.env.MAENCOF_EVAL_UPDATE_BASELINE = 'force';
    assertMeetsBaseline(baselineUrl, 'qga', metrics({ ndcg10: 0.85 }), 5);
    expect(storedNdcg()).toBe(0.85);
  });
});

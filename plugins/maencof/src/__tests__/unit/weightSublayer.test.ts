/**
 * @file weightSublayer.test.ts
 * @description getLayerDecay 의 우선순위와 값.
 *
 * 감쇠 인자는 확산 시 곱해지는 계수라 클수록 넓게 퍼진다. 축은 U자형이며
 * 허브는 레이어·서브레이어를 덮어쓴다.
 */
import { describe, expect, it } from 'vitest';

import {
  LAYER_DECAY_FACTORS,
  SUBLAYER_DECAY_FACTORS,
  getLayerDecay,
} from '../../core/weightCalculator/index.js';
import { Layer } from '../../types/common.js';

describe('getLayerDecay — 레이어 축', () => {
  it.each([
    [Layer.L1_CORE, 0.5],
    [Layer.L2_DERIVED, 0.7],
    [Layer.L3_EXTERNAL, 0.8],
    [Layer.L4_ACTION, 0.9],
    [Layer.L5_CONTEXT, 0.45],
  ])('layer=%d → %f', (layer, expected) => {
    expect(getLayerDecay(layer)).toBe(expected);
  });

  it('U자형이다 — 코어와 임시 수용소가 양 극단에서 가장 좁게 퍼진다', () => {
    expect(getLayerDecay(Layer.L5_CONTEXT)).toBeLessThan(
      getLayerDecay(Layer.L1_CORE),
    );
    expect(getLayerDecay(Layer.L4_ACTION)).toBeGreaterThan(
      getLayerDecay(Layer.L1_CORE),
    );
  });
});

describe('getLayerDecay — 서브레이어 축', () => {
  it.each([
    ['relational', 0.75],
    ['structural', 0.8],
    ['topical', 0.85],
  ] as const)('L3 %s → %f', (subLayer, expected) => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, subLayer)).toBe(expected);
  });

  it('미등록 서브레이어(clusterseed)는 레이어 값으로 폴백한다', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'clusterseed')).toBe(
      LAYER_DECAY_FACTORS[Layer.L3_EXTERNAL],
    );
  });
});

describe('getLayerDecay — 허브 우선순위', () => {
  it('허브는 레이어 값을 덮어쓴다', () => {
    expect(getLayerDecay(Layer.L1_CORE, undefined, true)).toBe(0.95);
    expect(getLayerDecay(Layer.L4_ACTION, undefined, true)).toBe(0.95);
  });

  it('허브는 서브레이어 값도 덮어쓴다', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'relational', true)).toBe(0.95);
  });

  it('hub=false 는 덮어쓰지 않는다', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'relational', false)).toBe(0.75);
  });

  it('허브가 모든 레이어보다 넓게 퍼진다', () => {
    const hub = getLayerDecay(Layer.L3_EXTERNAL, undefined, true);
    for (const layer of [1, 2, 3, 4, 5] as Layer[])
      expect(hub).toBeGreaterThanOrEqual(getLayerDecay(layer));
  });
});

describe('SUBLAYER_DECAY_FACTORS', () => {
  it('L3 서브레이어 3개만 포함한다', () => {
    expect(Object.keys(SUBLAYER_DECAY_FACTORS).sort()).toEqual([
      'relational',
      'structural',
      'topical',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  SUBLAYER_DECAY_FACTORS,
  getLayerDecay,
} from '../../core/weight-calculator/weight-calculator.js';
import { Layer } from '../../types/common.js';

describe('getLayerDecay with sub-layer', () => {
  it('서브레이어 없으면 기존 레이어 감쇠 반환', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL)).toBe(0.8);
    expect(getLayerDecay(Layer.L5_CONTEXT)).toBe(0.95);
    expect(getLayerDecay(Layer.L1_CORE)).toBe(0.5);
  });

  it('L3A relational → 0.75', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'relational')).toBe(0.75);
  });

  it('L3B structural → 0.80', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'structural')).toBe(0.8);
  });

  it('L3C topical → 0.85', () => {
    expect(getLayerDecay(Layer.L3_EXTERNAL, 'topical')).toBe(0.85);
  });

  it('L5-Buffer → 0.95', () => {
    expect(getLayerDecay(Layer.L5_CONTEXT, 'buffer')).toBe(0.95);
  });

  it('L5-Boundary → 0.60', () => {
    expect(getLayerDecay(Layer.L5_CONTEXT, 'boundary')).toBe(0.6);
  });
});

describe('SUBLAYER_DECAY_FACTORS', () => {
  it('5개의 서브레이어 감쇠 인자를 포함한다', () => {
    expect(Object.keys(SUBLAYER_DECAY_FACTORS)).toHaveLength(5);
  });
});

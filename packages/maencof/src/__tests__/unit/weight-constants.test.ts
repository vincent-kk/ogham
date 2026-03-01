/**
 * @file weight-constants.test.ts
 * @description WeightCalculator 상수 및 정규화 단위 테스트
 * (LAYER_DECAY_FACTORS, getLayerDecay, normalizeWeights)
 */
import { describe, expect, it } from 'vitest';

import {
  LAYER_DECAY_FACTORS,
  getLayerDecay,
  normalizeWeights,
} from '../../core/weight-calculator.js';
import { Layer, toNodeId } from '../../types/common.js';
import type { KnowledgeEdge } from '../../types/graph.js';

describe('LAYER_DECAY_FACTORS', () => {
  it('Layer 1 감쇠 인자는 0.5이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L1_CORE]).toBe(0.5);
  });

  it('Layer 5 감쇠 인자는 0.95이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L5_CONTEXT]).toBe(0.95);
  });

  it('Layer 2 감쇠 인자는 0.7이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L2_DERIVED]).toBe(0.7);
  });

  it('Layer 3 감쇠 인자는 0.8이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L3_EXTERNAL]).toBe(0.8);
  });

  it('Layer 4 감쇠 인자는 0.9이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L4_ACTION]).toBe(0.9);
  });

  it('Layer 5 감쇠 인자는 0.95이다', () => {
    expect(LAYER_DECAY_FACTORS[Layer.L5_CONTEXT]).toBe(0.95);
  });
});

describe('getLayerDecay', () => {
  it('각 Layer에 올바른 감쇠 인자를 반환한다', () => {
    expect(getLayerDecay(Layer.L1_CORE)).toBe(0.5);
    expect(getLayerDecay(Layer.L2_DERIVED)).toBe(0.7);
    expect(getLayerDecay(Layer.L3_EXTERNAL)).toBe(0.8);
    expect(getLayerDecay(Layer.L4_ACTION)).toBe(0.9);
    expect(getLayerDecay(Layer.L5_CONTEXT)).toBe(0.95);
  });
});

describe('normalizeWeights', () => {
  it('빈 배열에서 빈 배열을 반환한다', () => {
    expect(normalizeWeights([])).toEqual([]);
  });

  it('모든 가중치가 0이면 변경하지 않는다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 0 },
    ];
    const result = normalizeWeights(edges);
    expect(result[0].weight).toBe(0);
  });

  it('정규화 후 최대 가중치는 1.0이다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 2.0 },
      { from: toNodeId('b'), to: toNodeId('c'), type: 'LINK', weight: 4.0 },
    ];
    const result = normalizeWeights(edges);
    const maxWeight = Math.max(...result.map((e) => e.weight));
    expect(maxWeight).toBeCloseTo(1.0, 10);
  });

  it('가중치 비율을 유지한다', () => {
    const edges: KnowledgeEdge[] = [
      { from: toNodeId('a'), to: toNodeId('b'), type: 'LINK', weight: 1.0 },
      { from: toNodeId('b'), to: toNodeId('c'), type: 'LINK', weight: 2.0 },
    ];
    const result = normalizeWeights(edges);
    expect(result[1].weight / result[0].weight).toBeCloseTo(2.0, 10);
  });
});

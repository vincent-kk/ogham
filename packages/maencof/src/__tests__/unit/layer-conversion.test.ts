/**
 * @file layer-conversion.test.ts
 * @description layerFromDir / dirFromLayer 변환 함수 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { Layer, dirFromLayer, layerFromDir } from '../../types/common.js';

describe('layerFromDir', () => {
  it('01_Core → L1_CORE', () => {
    expect(layerFromDir('01_Core')).toBe(Layer.L1_CORE);
  });

  it('02_Derived → L2_DERIVED', () => {
    expect(layerFromDir('02_Derived')).toBe(Layer.L2_DERIVED);
  });

  it('03_External → L3_EXTERNAL', () => {
    expect(layerFromDir('03_External')).toBe(Layer.L3_EXTERNAL);
  });

  it('04_Action → L4_ACTION', () => {
    expect(layerFromDir('04_Action')).toBe(Layer.L4_ACTION);
  });

  it('05_Context → L5_CONTEXT', () => {
    expect(layerFromDir('05_Context')).toBe(Layer.L5_CONTEXT);
  });

  it('알 수 없는 디렉토리 이름은 undefined를 반환한다', () => {
    expect(layerFromDir('unknown')).toBeUndefined();
    expect(layerFromDir('')).toBeUndefined();
    expect(layerFromDir('06_Future')).toBeUndefined();
  });
});

describe('dirFromLayer', () => {
  it('L1_CORE → 01_Core', () => {
    expect(dirFromLayer(Layer.L1_CORE)).toBe('01_Core');
  });

  it('L2_DERIVED → 02_Derived', () => {
    expect(dirFromLayer(Layer.L2_DERIVED)).toBe('02_Derived');
  });

  it('L3_EXTERNAL → 03_External', () => {
    expect(dirFromLayer(Layer.L3_EXTERNAL)).toBe('03_External');
  });

  it('L4_ACTION → 04_Action', () => {
    expect(dirFromLayer(Layer.L4_ACTION)).toBe('04_Action');
  });

  it('L5_CONTEXT → 05_Context', () => {
    expect(dirFromLayer(Layer.L5_CONTEXT)).toBe('05_Context');
  });

  it('layerFromDir과 dirFromLayer는 왕복 변환이 가능하다', () => {
    for (const layer of [
      Layer.L1_CORE,
      Layer.L2_DERIVED,
      Layer.L3_EXTERNAL,
      Layer.L4_ACTION,
      Layer.L5_CONTEXT,
    ]) {
      const dir = dirFromLayer(layer);
      expect(layerFromDir(dir)).toBe(layer);
    }
  });
});

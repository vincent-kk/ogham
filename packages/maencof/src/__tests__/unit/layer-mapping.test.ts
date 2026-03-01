/**
 * @file layer-mapping.test.ts
 * @description LAYER_DIR 상수 매핑 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { LAYER_DIR, Layer } from '../../types/common.js';

describe('LAYER_DIR', () => {
  it('L1_CORE는 01_Core 디렉토리에 매핑된다', () => {
    expect(LAYER_DIR[Layer.L1_CORE]).toBe('01_Core');
  });

  it('L2_DERIVED는 02_Derived 디렉토리에 매핑된다', () => {
    expect(LAYER_DIR[Layer.L2_DERIVED]).toBe('02_Derived');
  });

  it('L3_EXTERNAL는 03_External 디렉토리에 매핑된다', () => {
    expect(LAYER_DIR[Layer.L3_EXTERNAL]).toBe('03_External');
  });

  it('L4_ACTION은 04_Action 디렉토리에 매핑된다', () => {
    expect(LAYER_DIR[Layer.L4_ACTION]).toBe('04_Action');
  });

  it('L5_CONTEXT는 05_Context 디렉토리에 매핑된다', () => {
    expect(LAYER_DIR[Layer.L5_CONTEXT]).toBe('05_Context');
  });

  it('모든 5개 레이어가 매핑되어 있다', () => {
    expect(Object.keys(LAYER_DIR)).toHaveLength(5);
  });
});

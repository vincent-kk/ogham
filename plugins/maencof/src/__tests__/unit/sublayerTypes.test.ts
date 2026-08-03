/**
 * @file sublayerTypes.test.ts
 * @description 레이어 좌표 타입·상수 계약.
 */
import { describe, expect, it } from 'vitest';

import {
  type BufferType,
  EXPECTED_ARCHITECTURE_VERSION,
  type EdgeType,
  type HubKind,
  L3_SUBDIR,
  type PromotionTarget,
  type SubLayer,
} from '../../types/index.js';

describe('SubLayer types', () => {
  it('SubLayer 는 L3 방향성 3종이다 — 서브레이어를 갖는 레이어는 L3 뿐', () => {
    const values: SubLayer[] = ['relational', 'structural', 'topical'];
    expect(values).toHaveLength(3);
  });

  it('BufferType 은 L5 항목의 종류 3종이다', () => {
    const values: BufferType[] = ['snippet', 'conversation', 'unclassified'];
    expect(values).toHaveLength(3);
  });

  it('PromotionTarget 은 서브레이어 이름 또는 L2 토큰이다', () => {
    const values: PromotionTarget[] = [
      'relational',
      'structural',
      'topical',
      'L2',
    ];
    expect(values).toHaveLength(4);
  });

  it('HubKind 는 문서 종류 4종이다', () => {
    const values: HubKind[] = [
      'project_moc',
      'cross_domain',
      'synthesis',
      'study_hub',
    ];
    expect(values).toHaveLength(4);
  });
});

describe('L3_SUBDIR', () => {
  it('3개의 서브레이어 디렉토리를 매핑한다', () => {
    expect(L3_SUBDIR.relational).toBe('relational');
    expect(L3_SUBDIR.structural).toBe('structural');
    expect(L3_SUBDIR.topical).toBe('topical');
    expect(Object.keys(L3_SUBDIR)).toHaveLength(3);
  });
});

describe('EdgeType', () => {
  it('CROSS_LAYER를 포함한다', () => {
    const crossLayer: EdgeType = 'CROSS_LAYER';
    expect(crossLayer).toBe('CROSS_LAYER');
  });

  it('기존 EdgeType 값을 유지한다', () => {
    const existing: EdgeType[] = [
      'LINK',
      'PARENT_OF',
      'CHILD_OF',
      'SIBLING',
      'RELATIONSHIP',
      'CROSS_LAYER',
      'DOMAIN',
    ];
    expect(existing).toHaveLength(7);
  });
});

describe('EXPECTED_ARCHITECTURE_VERSION', () => {
  it('3.0.0이다', () => {
    expect(EXPECTED_ARCHITECTURE_VERSION).toBe('3.0.0');
  });
});

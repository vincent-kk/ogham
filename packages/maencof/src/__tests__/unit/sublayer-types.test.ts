import { describe, expect, it } from 'vitest';

import {
  EXPECTED_ARCHITECTURE_VERSION,
  type EdgeType,
  type L3SubLayer,
  L3_SUBDIR,
  type L5SubLayer,
  L5_SUBDIR,
  type SubLayer,
} from '../../types/index.js';

describe('SubLayer types', () => {
  describe('L3SubLayer', () => {
    it('relational/structural/topical 값을 허용한다', () => {
      const values: L3SubLayer[] = ['relational', 'structural', 'topical'];
      expect(values).toHaveLength(3);
    });
  });

  describe('L5SubLayer', () => {
    it('buffer/boundary 값을 허용한다', () => {
      const values: L5SubLayer[] = ['buffer', 'boundary'];
      expect(values).toHaveLength(2);
    });
  });

  describe('SubLayer union', () => {
    it('L3SubLayer과 L5SubLayer의 유니온이다', () => {
      const all: SubLayer[] = [
        'relational',
        'structural',
        'topical',
        'buffer',
        'boundary',
      ];
      expect(all).toHaveLength(5);
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

  describe('L5_SUBDIR', () => {
    it('2개의 서브레이어 디렉토리를 매핑한다', () => {
      expect(L5_SUBDIR.buffer).toBe('buffer');
      expect(L5_SUBDIR.boundary).toBe('boundary');
      expect(Object.keys(L5_SUBDIR)).toHaveLength(2);
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
      ];
      expect(existing).toHaveLength(6);
    });
  });

  describe('EXPECTED_ARCHITECTURE_VERSION', () => {
    it('2.0.0이다', () => {
      expect(EXPECTED_ARCHITECTURE_VERSION).toBe('2.0.0');
    });
  });
});

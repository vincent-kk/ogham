import { describe, expect, it } from 'vitest';

import { FrontmatterSchema } from '../../../types/frontmatter.js';

const baseFm = {
  created: '2026-01-01',
  updated: '2026-03-04',
  tags: ['test'],
  layer: 3,
};

describe('FrontmatterSchema sub_layer', () => {
  describe('backward compatibility', () => {
    it('sub_layer 없이 기존 frontmatter가 통과한다', () => {
      const result = FrontmatterSchema.safeParse(baseFm);
      expect(result.success).toBe(true);
    });

    it('layer 1-4에서 sub_layer 없이 통과한다', () => {
      for (const layer of [1, 2, 3, 4, 5]) {
        const result = FrontmatterSchema.safeParse({ ...baseFm, layer });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('L3 sub_layer values', () => {
    it.each(['relational', 'structural', 'topical'] as const)(
      'layer=3, sub_layer=%s 통과',
      (sub_layer) => {
        const result = FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer,
        });
        expect(result.success).toBe(true);
      },
    );

    it('layer=3에서 buffer는 거부된다', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'buffer',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('L5 sub_layer values', () => {
    it.each(['buffer', 'boundary'] as const)(
      'layer=5, sub_layer=%s 통과',
      (sub_layer) => {
        const result = FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 5,
          sub_layer,
        });
        expect(result.success).toBe(true);
      },
    );

    it('layer=5에서 relational은 거부된다', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'relational',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('non-L3/L5 layers reject sub_layer', () => {
    it.each([1, 2, 4])('layer=%d에서 sub_layer 지정 시 거부', (layer) => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer,
        sub_layer: 'relational',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sub-layer field exclusivity', () => {
    it('L3A(relational)에서 org_type 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'relational',
        org_type: 'company',
      });
      expect(result.success).toBe(false);
    });

    it('L3B(structural)에서 person_ref 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'structural',
        person_ref: 'alice',
      });
      expect(result.success).toBe(false);
    });

    it('L5-Buffer에서 boundary_type 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'buffer',
        boundary_type: 'project_moc',
      });
      expect(result.success).toBe(false);
    });

    it('L5-Buffer에서 connected_layers 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'buffer',
        connected_layers: [1, 3],
      });
      expect(result.success).toBe(false);
    });

    it('L5-Boundary에서 buffer_type 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'boundary',
        buffer_type: 'inbox',
      });
      expect(result.success).toBe(false);
    });

    it('L5-Boundary에서 promotion_target 지정 시 거부', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'boundary',
        promotion_target: 2,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sub-layer specific fields accepted', () => {
    it('L3A(relational) 전용 필드 통과', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'relational',
        person_ref: 'alice',
        trust_level: 0.8,
        expertise_domains: ['typescript', 'react'],
      });
      expect(result.success).toBe(true);
    });

    it('L3B(structural) 전용 필드 통과', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'structural',
        org_type: 'company',
        membership_status: 'active',
        ba_context: 'engineering team',
      });
      expect(result.success).toBe(true);
    });

    it('L3C(topical) 전용 필드 통과', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 3,
        sub_layer: 'topical',
        topic_category: 'programming',
        maturity: 'growing',
      });
      expect(result.success).toBe(true);
    });

    it('L5-Buffer 전용 필드 통과', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'buffer',
        buffer_type: 'inbox',
        promotion_target: 2,
      });
      expect(result.success).toBe(true);
    });

    it('L5-Boundary 전용 필드 통과', () => {
      const result = FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        sub_layer: 'boundary',
        boundary_type: 'project_moc',
        connected_layers: [1, 3],
      });
      expect(result.success).toBe(true);
    });
  });
});

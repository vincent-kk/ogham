/**
 * @file frontmatterSublayer.test.ts
 * @description FrontmatterSchema 의 sub_layer 규칙 — 서브레이어는 L3 전용이다.
 *
 * L5 전용 필드와 hub 속성 규칙은 형제 파일 frontmatterHubBuffer.test.ts 가 소유한다
 * (파일당 케이스 상한 분할).
 */
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
      expect(FrontmatterSchema.safeParse(baseFm).success).toBe(true);
    });

    it('layer 1-5에서 sub_layer 없이 통과한다', () => {
      for (const layer of [1, 2, 3, 4, 5])
        expect(FrontmatterSchema.safeParse({ ...baseFm, layer }).success).toBe(
          true,
        );
    });
  });

  describe('L3 sub_layer values', () => {
    it.each(['relational', 'structural', 'topical'] as const)(
      'layer=3, sub_layer=%s 통과',
      (sub_layer) => {
        expect(
          FrontmatterSchema.safeParse({ ...baseFm, layer: 3, sub_layer })
            .success,
        ).toBe(true);
      },
    );

    it('layer=3에서 폐지된 buffer 값은 거부된다', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'buffer',
        }).success,
      ).toBe(false);
    });
  });

  describe('L5 has no sub-layer', () => {
    it.each(['relational', 'buffer', 'boundary'])(
      'layer=5에서 sub_layer=%s 는 거부된다',
      (sub_layer) => {
        expect(
          FrontmatterSchema.safeParse({ ...baseFm, layer: 5, sub_layer })
            .success,
        ).toBe(false);
      },
    );
  });

  describe('non-L3 layers reject sub_layer', () => {
    it.each([1, 2, 4])('layer=%d에서 sub_layer 지정 시 거부', (layer) => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer,
          sub_layer: 'relational',
        }).success,
      ).toBe(false);
    });
  });

  describe('sub-layer field exclusivity', () => {
    it('L3A(relational)에서 org_type 지정 시 거부', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'relational',
          org_type: 'company',
        }).success,
      ).toBe(false);
    });

    it('L3B(structural)에서 person_ref 지정 시 거부', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'structural',
          person_ref: 'alice',
        }).success,
      ).toBe(false);
    });
  });

  describe('sub-layer specific fields accepted', () => {
    it('L3A(relational) 전용 필드 통과', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'relational',
          person_ref: 'alice',
          trust_level: 0.8,
          expertise_domains: ['typescript', 'react'],
        }).success,
      ).toBe(true);
    });

    it('L3B(structural) 전용 필드 통과', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'structural',
          org_type: 'company',
          membership_status: 'active',
          ba_context: 'engineering team',
        }).success,
      ).toBe(true);
    });

    it('L3C(topical) 전용 필드 통과', () => {
      expect(
        FrontmatterSchema.safeParse({
          ...baseFm,
          layer: 3,
          sub_layer: 'topical',
          topic_category: 'programming',
          maturity: 'growing',
        }).success,
      ).toBe(true);
    });
  });
});

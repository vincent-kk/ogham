/**
 * @file frontmatterWriteValidation.test.ts
 * @description validateFrontmatter() — write-path 객체 단계 검증의 단일 진입점.
 *
 * 4 base 통과 + 14 parameterized 거부.
 */
import { describe, expect, it } from 'vitest';

import { validateFrontmatter } from '../../../types/frontmatter.js';

const baseFm = {
  created: '2026-04-28',
  updated: '2026-04-28',
  tags: ['test'],
};

describe('validateFrontmatter — base accept cases', () => {
  it('L3-relational 통과', () => {
    const result = validateFrontmatter({
      ...baseFm,
      layer: 3,
      sub_layer: 'relational',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.layer).toBe(3);
      expect(result.data.sub_layer).toBe('relational');
    }
  });

  it('L5(임시 수용소) 통과 — 서브레이어 없이 buffer 필드만', () => {
    const result = validateFrontmatter({
      ...baseFm,
      layer: 5,
      buffer_type: 'snippet',
      promotion_target: 'topical',
      source_context: '대화 중 멘션',
    });
    expect(result.ok).toBe(true);
  });

  it('L3 허브 통과 — hub 는 레이어 직교 속성', () => {
    const result = validateFrontmatter({
      ...baseFm,
      layer: 3,
      sub_layer: 'structural',
      hub: true,
      hub_kind: 'project_moc',
      purpose: '제어이론 학습 경로 통합',
    });
    expect(result.ok).toBe(true);
  });

  it('L4 + no sub_layer 통과', () => {
    const result = validateFrontmatter({ ...baseFm, layer: 4 });
    expect(result.ok).toBe(true);
  });
});

describe('validateFrontmatter — write-path reject cases (parameterized)', () => {
  it.each([
    {
      name: 'L4 + sub_layer:topical',
      patch: { layer: 4, sub_layer: 'topical' },
      errorContains: 'sub_layer is only valid for Layer 3',
    },
    {
      name: 'L2 + sub_layer:topical',
      patch: { layer: 2, sub_layer: 'topical' },
      errorContains: 'sub_layer is only valid for Layer 3',
    },
    {
      name: 'L1 + sub_layer:relational',
      patch: { layer: 1, sub_layer: 'relational' },
      errorContains: 'sub_layer is only valid for Layer 3',
    },
    {
      name: 'L3 + sub_layer:buffer (폐지된 값)',
      patch: { layer: 3, sub_layer: 'buffer' },
      errorContains: 'sub_layer',
    },
    {
      name: 'L5 + sub_layer:relational (L5는 서브레이어가 없다)',
      patch: { layer: 5, sub_layer: 'relational' },
      errorContains: 'sub_layer is only valid for Layer 3',
    },
    {
      name: 'L4 + sub_layer:structural',
      patch: { layer: 4, sub_layer: 'structural' },
      errorContains: 'sub_layer is only valid for Layer 3',
    },
    {
      name: 'L3A + org_type (exclusive to L3B)',
      patch: { layer: 3, sub_layer: 'relational', org_type: 'company' },
      errorContains: 'org_type is exclusive to L3B',
    },
    {
      name: 'L3B + person_ref (exclusive to L3A)',
      patch: { layer: 3, sub_layer: 'structural', person_ref: 'alice' },
      errorContains: 'person_ref is exclusive to L3A',
    },
    {
      name: 'L3 + buffer_type (L5 전용)',
      patch: { layer: 3, buffer_type: 'snippet' },
      errorContains: 'buffer_type is exclusive to Layer 5',
    },
    {
      name: 'L4 + promotion_target (L5 전용)',
      patch: { layer: 4, promotion_target: 'topical' },
      errorContains: 'promotion_target is exclusive to Layer 5',
    },
    {
      name: 'L2 + source_context (L5 전용)',
      patch: { layer: 2, source_context: '웹 스크랩' },
      errorContains: 'source_context is exclusive to Layer 5',
    },
    {
      name: 'hub=true + purpose 누락',
      patch: { layer: 3, hub: true, hub_kind: 'synthesis' },
      errorContains: 'hub requires purpose',
    },
    {
      name: 'purpose 만 있고 hub 선언 없음',
      patch: { layer: 3, purpose: '무언가 통합' },
      errorContains: 'hub_kind and purpose require hub: true',
    },
    {
      name: 'L5 + hub=true (임시 수용소는 다리가 되지 않는다)',
      patch: { layer: 5, hub: true, purpose: '통합' },
      errorContains: 'Layer 5 documents cannot be hubs',
    },
  ])('rejects $name', ({ patch, errorContains }) => {
    const result = validateFrontmatter({ ...baseFm, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes(errorContains))).toBe(true);
      expect(result.errors[0]).toMatch(/^[a-zA-Z_]+: /);
    }
  });
});

/**
 * @file frontmatter-write-validation.spec.ts
 * @description validateFrontmatter() — write-path 객체 단계 검증의 단일 진입점.
 *
 * 3+12 룰: 3 base 통과 + 12 parameterized 거부.
 */
import { describe, expect, it } from 'vitest';

import { validateFrontmatter } from '../../../types/frontmatter.js';

const baseFm = {
  created: '2026-04-28',
  updated: '2026-04-28',
  tags: ['test'],
};

describe('validateFrontmatter — base accept cases (3)', () => {
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

  it('L5-boundary 통과', () => {
    const result = validateFrontmatter({
      ...baseFm,
      layer: 5,
      sub_layer: 'boundary',
      boundary_type: 'project_moc',
      connected_layers: [1, 3],
    });
    expect(result.ok).toBe(true);
  });

  it('L4 + no sub_layer 통과', () => {
    const result = validateFrontmatter({ ...baseFm, layer: 4 });
    expect(result.ok).toBe(true);
  });
});

describe('validateFrontmatter — write-path reject cases (12 parameterized)', () => {
  type RejectCase = {
    name: string;
    input: Record<string, unknown>;
    errorContains: string;
  };

  const cases: RejectCase[] = [
    {
      name: 'L4 + sub_layer:topical',
      input: { ...baseFm, layer: 4, sub_layer: 'topical' },
      errorContains: 'sub_layer is only valid for Layer 3 or 5',
    },
    {
      name: 'L2 + sub_layer:topical',
      input: { ...baseFm, layer: 2, sub_layer: 'topical' },
      errorContains: 'sub_layer is only valid for Layer 3 or 5',
    },
    {
      name: 'L1 + sub_layer:relational',
      input: { ...baseFm, layer: 1, sub_layer: 'relational' },
      errorContains: 'sub_layer is only valid for Layer 3 or 5',
    },
    {
      name: 'L3 + sub_layer:buffer (L5-only)',
      input: { ...baseFm, layer: 3, sub_layer: 'buffer' },
      errorContains: 'Layer 3 sub_layer must be relational/structural/topical',
    },
    {
      name: 'L5 + sub_layer:relational (L3-only)',
      input: { ...baseFm, layer: 5, sub_layer: 'relational' },
      errorContains: 'Layer 5 sub_layer must be buffer/boundary',
    },
    {
      name: 'L4 + sub_layer:structural',
      input: { ...baseFm, layer: 4, sub_layer: 'structural' },
      errorContains: 'sub_layer is only valid for Layer 3 or 5',
    },
    {
      name: 'L3A + org_type (exclusive to L3B)',
      input: {
        ...baseFm,
        layer: 3,
        sub_layer: 'relational',
        org_type: 'company',
      },
      errorContains: 'org_type is exclusive to L3B',
    },
    {
      name: 'L3B + person_ref (exclusive to L3A)',
      input: {
        ...baseFm,
        layer: 3,
        sub_layer: 'structural',
        person_ref: 'alice',
      },
      errorContains: 'person_ref is exclusive to L3A',
    },
    {
      name: 'L5-Buffer + boundary_type (exclusive to L5-Boundary)',
      input: {
        ...baseFm,
        layer: 5,
        sub_layer: 'buffer',
        boundary_type: 'project_moc',
      },
      errorContains: 'boundary_type is exclusive to L5-Boundary',
    },
    {
      name: 'L5-Buffer + connected_layers (exclusive to L5-Boundary)',
      input: {
        ...baseFm,
        layer: 5,
        sub_layer: 'buffer',
        connected_layers: [1, 3],
      },
      errorContains: 'connected_layers is exclusive to L5-Boundary',
    },
    {
      name: 'L5-Boundary + buffer_type (exclusive to L5-Buffer)',
      input: {
        ...baseFm,
        layer: 5,
        sub_layer: 'boundary',
        buffer_type: 'inbox',
      },
      errorContains: 'buffer_type is exclusive to L5-Buffer',
    },
    {
      name: 'L5-Boundary + promotion_target (exclusive to L5-Buffer)',
      input: {
        ...baseFm,
        layer: 5,
        sub_layer: 'boundary',
        promotion_target: 2,
      },
      errorContains: 'promotion_target is exclusive to L5-Buffer',
    },
  ];

  it.each(cases)('rejects $name', ({ input, errorContains }) => {
    const result = validateFrontmatter(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes(errorContains))).toBe(true);
      expect(result.errors[0]).toMatch(/^[a-zA-Z_]+: /);
    }
  });
});

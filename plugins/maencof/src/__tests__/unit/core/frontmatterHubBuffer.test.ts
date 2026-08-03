/**
 * @file frontmatterHubBuffer.test.ts
 * @description FrontmatterSchema 의 Layer 5 전용 필드와 레이어 직교 hub 속성 규칙.
 *
 * sub_layer 규칙은 형제 파일 frontmatterSublayer.test.ts 가 소유한다 (파일당 케이스 상한 분할).
 */
import { describe, expect, it } from 'vitest';

import { FrontmatterSchema } from '../../../types/frontmatter.js';

const baseFm = {
  created: '2026-01-01',
  updated: '2026-03-04',
  tags: ['test'],
  layer: 3,
};

describe('FrontmatterSchema L5 buffer fields', () => {
  const l5 = { ...baseFm, layer: 5 };

  it('L5 전용 필드 통과', () => {
    expect(
      FrontmatterSchema.safeParse({
        ...l5,
        buffer_type: 'snippet',
        promotion_target: 'topical',
        source_context: '대화 중 멘션',
      }).success,
    ).toBe(true);
  });

  it.each(['inbox', 'unsorted', 'temp'])(
    '폐지된 buffer_type 값 %s 는 거부된다',
    (buffer_type) => {
      expect(FrontmatterSchema.safeParse({ ...l5, buffer_type }).success).toBe(
        false,
      );
    },
  );

  it('promotion_target 은 레이어 번호가 아니라 서브레이어 이름이다', () => {
    expect(
      FrontmatterSchema.safeParse({ ...l5, promotion_target: 3 }).success,
    ).toBe(false);
    expect(
      FrontmatterSchema.safeParse({ ...l5, promotion_target: 'L2' }).success,
    ).toBe(true);
  });

  it.each(['buffer_type', 'promotion_target', 'source_context'])(
    'L5 전용 필드 %s 는 다른 레이어에서 거부된다',
    (field) => {
      const value = field === 'buffer_type' ? 'snippet' : 'topical';
      expect(
        FrontmatterSchema.safeParse({ ...baseFm, layer: 3, [field]: value })
          .success,
      ).toBe(false);
    },
  );
});

describe('FrontmatterSchema hub — 레이어 직교 속성', () => {
  it.each([1, 2, 3, 4])('layer=%d 문서가 허브가 될 수 있다', (layer) => {
    expect(
      FrontmatterSchema.safeParse({
        ...baseFm,
        layer,
        hub: true,
        hub_kind: 'project_moc',
        purpose: '제어이론 학습 경로 통합',
      }).success,
    ).toBe(true);
  });

  it('hub=true 에 purpose 가 없으면 거부된다', () => {
    expect(
      FrontmatterSchema.safeParse({
        ...baseFm,
        hub: true,
        hub_kind: 'project_moc',
      }).success,
    ).toBe(false);
  });

  it.each(['hub_kind', 'purpose'])(
    'hub 선언 없이 %s 만 있으면 거부된다',
    (field) => {
      const value = field === 'hub_kind' ? 'synthesis' : '무언가 통합';
      expect(
        FrontmatterSchema.safeParse({ ...baseFm, [field]: value }).success,
      ).toBe(false);
    },
  );

  it('layer=5 문서는 허브가 될 수 없다', () => {
    expect(
      FrontmatterSchema.safeParse({
        ...baseFm,
        layer: 5,
        hub: true,
        purpose: '임시 수용소는 다리가 되지 않는다',
      }).success,
    ).toBe(false);
  });

  it('폐지된 boundary_type · connected_layers 는 통과해도 노드로 전파되지 않는다', () => {
    const result = FrontmatterSchema.safeParse({
      ...baseFm,
      boundary_type: 'project_moc',
      connected_layers: [2, 3],
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('boundary_type');
    expect(result.data).not.toHaveProperty('connected_layers');
  });
});

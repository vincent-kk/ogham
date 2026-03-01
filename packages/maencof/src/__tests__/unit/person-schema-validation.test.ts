/**
 * @file person-schema-validation.test.ts
 * @description PersonSchema 필수/선택 필드 및 intimacy_level, relationship_type 검증 테스트
 */
import { describe, expect, it } from 'vitest';

import { PersonSchema } from '../../types/person.js';

describe('PersonSchema', () => {
  it('필수 필드만으로 파싱 성공한다', () => {
    const result = PersonSchema.safeParse({
      name: 'Alice',
      relationship_type: 'friend',
      intimacy_level: 3,
    });
    expect(result.success).toBe(true);
  });

  it('모든 선택 필드 포함 시 파싱 성공한다', () => {
    const result = PersonSchema.safeParse({
      name: 'Bob',
      relationship_type: 'colleague',
      intimacy_level: 4,
      interaction_frequency: 'weekly',
      relationship_start: '2024-01-15',
      personality_type: 'analytical',
      mbti: 'INTJ',
      communication_style: 'direct',
      preferences: ['coffee', 'coding'],
      notes: '좋은 동료',
    });
    expect(result.success).toBe(true);
  });

  describe('intimacy_level 범위 검증', () => {
    it('intimacy_level 1은 유효하다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'acquaintance',
        intimacy_level: 1,
      });
      expect(result.success).toBe(true);
    });

    it('intimacy_level 5는 유효하다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'family',
        intimacy_level: 5,
      });
      expect(result.success).toBe(true);
    });

    it('intimacy_level 0은 실패한다 (min=1)', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 0,
      });
      expect(result.success).toBe(false);
    });

    it('intimacy_level 6은 실패한다 (max=5)', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 6,
      });
      expect(result.success).toBe(false);
    });

    it('intimacy_level 소수는 실패한다 (int 필수)', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 2.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('relationship_type enum 검증', () => {
    const validTypes = [
      'friend',
      'family',
      'colleague',
      'mentor',
      'mentee',
      'acquaintance',
    ];
    for (const type of validTypes) {
      it(`relationship_type '${type}'는 유효하다`, () => {
        const result = PersonSchema.safeParse({
          name: 'Alice',
          relationship_type: type,
          intimacy_level: 3,
        });
        expect(result.success).toBe(true);
      });
    }

    it('알 수 없는 relationship_type은 실패한다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'enemy',
        intimacy_level: 3,
      });
      expect(result.success).toBe(false);
    });
  });
});

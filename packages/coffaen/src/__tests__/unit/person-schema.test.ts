/**
 * @file person-schema.test.ts
 * @description PersonSchema Zod 스키마 단위 테스트
 */
import { describe, expect, it } from 'vitest';

import { PersonSchema, SYMMETRIC_RELATIONSHIPS } from '../../types/person.js';

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

  describe('MBTI 정규식 검증', () => {
    it('INTJ는 유효한 MBTI이다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'INTJ',
      });
      expect(result.success).toBe(true);
    });

    it('ENFP는 유효한 MBTI이다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'ENFP',
      });
      expect(result.success).toBe(true);
    });

    it('소문자 intj는 유효하다 (case insensitive)', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'intj',
      });
      expect(result.success).toBe(true);
    });

    it('XXXJ는 유효하지 않은 MBTI이다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'XXXJ',
      });
      expect(result.success).toBe(false);
    });

    it('ABCD는 유효하지 않은 MBTI이다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'ABCD',
      });
      expect(result.success).toBe(false);
    });

    it('3자리 문자열은 유효하지 않은 MBTI이다', () => {
      const result = PersonSchema.safeParse({
        name: 'Alice',
        relationship_type: 'friend',
        intimacy_level: 3,
        mbti: 'INT',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('name 필드 검증', () => {
    it('빈 문자열 name은 실패한다', () => {
      const result = PersonSchema.safeParse({
        name: '',
        relationship_type: 'friend',
        intimacy_level: 3,
      });
      expect(result.success).toBe(false);
    });

    it('공백만 있는 name은 실패하지 않는다 (min(1) 검사는 길이 기준)', () => {
      const result = PersonSchema.safeParse({
        name: ' ',
        relationship_type: 'friend',
        intimacy_level: 3,
      });
      // z.string().min(1)은 길이 1 이상이면 통과 (공백도 길이에 포함)
      expect(result.success).toBe(true);
    });
  });
});

describe('SYMMETRIC_RELATIONSHIPS', () => {
  it('friend가 포함되어 있다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).toContain('friend');
  });

  it('family가 포함되어 있다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).toContain('family');
  });

  it('colleague가 포함되어 있다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).toContain('colleague');
  });

  it('acquaintance가 포함되어 있다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).toContain('acquaintance');
  });

  it('mentor는 SYMMETRIC_RELATIONSHIPS에 없다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).not.toContain('mentor');
  });

  it('mentee는 SYMMETRIC_RELATIONSHIPS에 없다', () => {
    expect(SYMMETRIC_RELATIONSHIPS).not.toContain('mentee');
  });
});

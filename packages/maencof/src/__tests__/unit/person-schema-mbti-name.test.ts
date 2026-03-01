/**
 * @file person-schema-mbti-name.test.ts
 * @description PersonSchema MBTI/name 필드 및 SYMMETRIC_RELATIONSHIPS 검증 테스트
 */
import { describe, expect, it } from 'vitest';

import { PersonSchema, SYMMETRIC_RELATIONSHIPS } from '../../types/person.js';

describe('PersonSchema — MBTI 정규식 검증', () => {
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

describe('PersonSchema — name 필드 검증', () => {
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

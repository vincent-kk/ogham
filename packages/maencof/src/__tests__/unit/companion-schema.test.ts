/**
 * @file companion-schema.test.ts
 * @description CompanionIdentity Zod 스키마 + isValidCompanionIdentity 수동 타입 가드 테스트
 */
import { describe, expect, it } from 'vitest';

import { isValidCompanionIdentity } from '../../types/companion-guard.js';
import {
  CompanionIdentitySchema,
  CompanionPersonalitySchema,
} from '../../types/companion.js';

/** 완전한 유효 companion identity 픽스처 */
function validIdentity(overrides?: Record<string, unknown>) {
  return {
    schema_version: 1,
    name: 'Mochi',
    role: '지식 정리 파트너',
    personality: {
      tone: '따뜻한',
      approach: '체계적',
      traits: ['꼼꼼한', '친근한'],
    },
    principles: ['정확성을 우선한다', '사용자의 의도를 존중한다'],
    taboos: ['개인 정보를 외부에 노출하지 않는다'],
    origin_story: '당신의 지식을 함께 정리하기 위해 태어났습니다.',
    greeting: '오늘도 함께 정리해볼까요?',
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

describe('CompanionPersonalitySchema', () => {
  it('유효한 personality를 통과시킨다', () => {
    const result = CompanionPersonalitySchema.safeParse({
      tone: '따뜻한',
      approach: '체계적',
      traits: ['꼼꼼한'],
    });
    expect(result.success).toBe(true);
  });

  it('빈 traits 배열을 거부한다', () => {
    const result = CompanionPersonalitySchema.safeParse({
      tone: '따뜻한',
      approach: '체계적',
      traits: [],
    });
    expect(result.success).toBe(false);
  });

  it('빈 문자열 tone을 거부한다', () => {
    const result = CompanionPersonalitySchema.safeParse({
      tone: '',
      approach: '체계적',
      traits: ['꼼꼼한'],
    });
    expect(result.success).toBe(false);
  });
});

describe('CompanionIdentitySchema', () => {
  it('완전한 유효 identity를 통과시킨다', () => {
    const result = CompanionIdentitySchema.safeParse(validIdentity());
    expect(result.success).toBe(true);
  });

  it('schema_version 2를 거부한다 (literal 1)', () => {
    const result = CompanionIdentitySchema.safeParse(
      validIdentity({ schema_version: 2 }),
    );
    expect(result.success).toBe(false);
  });

  it('빈 name을 거부한다', () => {
    const result = CompanionIdentitySchema.safeParse(
      validIdentity({ name: '' }),
    );
    expect(result.success).toBe(false);
  });

  it('누락된 role을 거부한다', () => {
    const { role: _, ...noRole } = validIdentity();
    const result = CompanionIdentitySchema.safeParse(noRole);
    expect(result.success).toBe(false);
  });

  it('빈 principles를 거부한다', () => {
    const result = CompanionIdentitySchema.safeParse(
      validIdentity({ principles: [] }),
    );
    expect(result.success).toBe(false);
  });

  it('빈 taboos를 거부한다', () => {
    const result = CompanionIdentitySchema.safeParse(
      validIdentity({ taboos: [] }),
    );
    expect(result.success).toBe(false);
  });

  it('잘못된 datetime 형식을 거부한다', () => {
    const result = CompanionIdentitySchema.safeParse(
      validIdentity({ created_at: 'not-a-date' }),
    );
    expect(result.success).toBe(false);
  });

  it('누락된 greeting을 거부한다', () => {
    const { greeting: _, ...noGreeting } = validIdentity();
    const result = CompanionIdentitySchema.safeParse(noGreeting);
    expect(result.success).toBe(false);
  });
});

describe('isValidCompanionIdentity (수동 타입 가드)', () => {
  it('완전한 유효 identity를 통과시킨다', () => {
    expect(isValidCompanionIdentity(validIdentity())).toBe(true);
  });

  it('최소 필드(schema_version, name, greeting)만으로 통과한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 1,
        name: 'Mochi',
        greeting: '안녕!',
      }),
    ).toBe(true);
  });

  it('schema_version 2도 통과한다 (>= 1)', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 2,
        name: 'Mochi',
        greeting: '안녕!',
      }),
    ).toBe(true);
  });

  it('null을 거부한다', () => {
    expect(isValidCompanionIdentity(null)).toBe(false);
  });

  it('undefined를 거부한다', () => {
    expect(isValidCompanionIdentity(undefined)).toBe(false);
  });

  it('문자열을 거부한다', () => {
    expect(isValidCompanionIdentity('not-an-object')).toBe(false);
  });

  it('schema_version 0을 거부한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 0,
        name: 'Mochi',
        greeting: '안녕!',
      }),
    ).toBe(false);
  });

  it('schema_version이 문자열이면 거부한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: '1',
        name: 'Mochi',
        greeting: '안녕!',
      }),
    ).toBe(false);
  });

  it('빈 name을 거부한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 1,
        name: '',
        greeting: '안녕!',
      }),
    ).toBe(false);
  });

  it('빈 greeting을 거부한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 1,
        name: 'Mochi',
        greeting: '',
      }),
    ).toBe(false);
  });

  it('name 누락 시 거부한다', () => {
    expect(
      isValidCompanionIdentity({
        schema_version: 1,
        greeting: '안녕!',
      }),
    ).toBe(false);
  });
});

describe('Zod/수동 타입 가드 교차 검증', () => {
  it('최소 필드만 있으면 Zod 무효 + 수동 유효 (superset 의도)', () => {
    const minimal = { schema_version: 1, name: 'X', greeting: 'Y' };
    expect(CompanionIdentitySchema.safeParse(minimal).success).toBe(false);
    expect(isValidCompanionIdentity(minimal)).toBe(true);
  });

  it('schema_version 2 + 미래 필드면 수동 유효 (미래 호환)', () => {
    const future = {
      schema_version: 2,
      name: 'X',
      greeting: 'Y',
      future_field: true,
    };
    expect(isValidCompanionIdentity(future)).toBe(true);
  });
});

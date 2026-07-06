/**
 * @file companionSchema.test.ts
 * @description Companion 레거시(v1)/정본 Zod 스키마 + 수동 타입 가드 테스트.
 */
import { describe, expect, it } from 'vitest';

import {
  CompanionIdentitySchema,
  CompanionIdentityV1Schema,
  CompanionSectionSchema,
} from '../../types/companion.js';
import {
  getCompanionSchemaVersion,
  isValidCompanionIdentity,
} from '../../types/companionGuard.js';

function v1(overrides?: Record<string, unknown>) {
  return {
    name: 'Mochi',
    role: 'partner',
    personality: { tone: 'warm', approach: 'systematic', traits: ['careful'] },
    principles: ['accuracy first'],
    taboos: ['no external leaks'],
    origin_story: 'Born to organize your knowledge.',
    greeting: 'Shall we organize today?',
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
    ...overrides,
  };
}

function v2(overrides?: Record<string, unknown>) {
  return {
    schema_version: 2,
    name: 'Nao',
    greeting: 'Welcome back.',
    sections: [{ key: 'tone', inject: 'both', salience: 5, detail: 'calm' }],
    created_at: '2026-07-07T00:00:00Z',
    updated_at: '2026-07-07T00:00:00Z',
    ...overrides,
  };
}

describe('CompanionIdentityV1Schema (preserved for migration input)', () => {
  it('accepts a valid v1 identity', () => {
    expect(CompanionIdentityV1Schema.safeParse(v1()).success).toBe(true);
  });

  it('rejects empty principles and bad datetime', () => {
    expect(
      CompanionIdentityV1Schema.safeParse(v1({ principles: [] })).success,
    ).toBe(false);
    expect(
      CompanionIdentityV1Schema.safeParse(v1({ created_at: 'not-a-date' }))
        .success,
    ).toBe(false);
  });
});

describe('CompanionSectionSchema', () => {
  it('accepts a valid section', () => {
    expect(
      CompanionSectionSchema.safeParse({
        key: 'tone',
        inject: 'both',
        salience: 3,
        detail: 'x',
      }).success,
    ).toBe(true);
  });

  it('rejects out-of-range salience, bad inject, and empty detail', () => {
    expect(
      CompanionSectionSchema.safeParse({
        key: 'k',
        inject: 'both',
        salience: 6,
        detail: 'x',
      }).success,
    ).toBe(false);
    expect(
      CompanionSectionSchema.safeParse({
        key: 'k',
        inject: 'nope',
        salience: 3,
        detail: 'x',
      }).success,
    ).toBe(false);
    expect(
      CompanionSectionSchema.safeParse({
        key: 'k',
        inject: 'both',
        salience: 3,
        detail: '',
      }).success,
    ).toBe(false);
  });

  it('rejects a non-integer salience', () => {
    expect(
      CompanionSectionSchema.safeParse({
        key: 'k',
        inject: 'both',
        salience: 2.5,
        detail: 'x',
      }).success,
    ).toBe(false);
  });
});

describe('CompanionIdentitySchema', () => {
  it('accepts a valid canonical identity', () => {
    expect(CompanionIdentitySchema.safeParse(v2()).success).toBe(true);
  });

  it('rejects schema_version other than 2 and an empty sections array', () => {
    expect(
      CompanionIdentitySchema.safeParse(v2({ schema_version: 1 })).success,
    ).toBe(false);
    expect(
      CompanionIdentitySchema.safeParse(v2({ sections: [] })).success,
    ).toBe(false);
  });

  it('rejects an empty greeting', () => {
    expect(
      CompanionIdentitySchema.safeParse(v2({ greeting: '' })).success,
    ).toBe(false);
  });
});

describe('isValidCompanionIdentity + getCompanionSchemaVersion', () => {
  it('passes both v1 and canonical shapes (name + greeting)', () => {
    expect(isValidCompanionIdentity(v1())).toBe(true);
    expect(isValidCompanionIdentity(v2())).toBe(true);
    expect(isValidCompanionIdentity({ name: 'X', greeting: 'Y' })).toBe(true);
  });

  it('rejects missing name/greeting, null, and non-objects', () => {
    expect(isValidCompanionIdentity({ greeting: 'Y' })).toBe(false);
    expect(isValidCompanionIdentity({ name: 'X' })).toBe(false);
    expect(isValidCompanionIdentity(null)).toBe(false);
    expect(isValidCompanionIdentity('nope')).toBe(false);
  });

  it('reads schema_version, defaulting to 1 when absent or non-numeric', () => {
    expect(getCompanionSchemaVersion(v2())).toBe(2);
    expect(getCompanionSchemaVersion(v1())).toBe(1);
    expect(
      getCompanionSchemaVersion({
        schema_version: 'x',
        name: 'a',
        greeting: 'b',
      }),
    ).toBe(1);
  });
});

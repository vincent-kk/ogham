import { describe, expect, it } from 'vitest';

import { normalizeCompanionIdentity } from '../normalizeCompanionIdentity.js';

function v1(overrides?: Record<string, unknown>) {
  return {
    name: 'Nao',
    role: 'mirror advisor',
    personality: {
      tone: 'calm',
      approach: 'structured',
      traits: ['brief', 'exact'],
    },
    principles: ['P1', 'P2'],
    taboos: ['T1'],
    origin_story: 'Born to think alongside you.',
    greeting: 'Welcome back.',
    created_at: '2026-05-06T00:00:00Z',
    updated_at: '2026-05-06T00:00:00Z',
    ...overrides,
  };
}

describe('normalizeCompanionIdentity — v1 field mapping (§7-2)', () => {
  it('maps personality/principles/taboos/origin to sections with the specified inject+salience', () => {
    const v2 = normalizeCompanionIdentity(v1());
    expect(v2).not.toBeNull();
    const byKey = Object.fromEntries(
      (v2?.sections ?? []).map((s) => [s.key, s]),
    );
    expect(byKey.role).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'mirror advisor',
    });
    expect(byKey.tone).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'calm',
    });
    expect(byKey.approach).toMatchObject({
      inject: 'turn',
      salience: 4,
      detail: 'structured',
    });
    expect(byKey.traits).toMatchObject({
      inject: 'turn',
      salience: 3,
      detail: 'brief, exact',
    });
    expect(byKey.principles).toMatchObject({
      inject: 'both',
      salience: 4,
      detail: 'P1 | P2',
    });
    expect(byKey.taboos).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'T1',
    });
    expect(byKey.origin).toMatchObject({ inject: 'session', salience: 1 });
  });

  it('preserves name/greeting/created_at and maps role into a section (no core role)', () => {
    const v2 = normalizeCompanionIdentity(v1());
    expect(v2).toMatchObject({
      schema_version: 2,
      name: 'Nao',
      greeting: 'Welcome back.',
      created_at: '2026-05-06T00:00:00Z',
    });
    expect(v2).not.toHaveProperty('role');
    expect(v2?.sections.find((s) => s.key === 'role')?.detail).toBe(
      'mirror advisor',
    );
  });

  it('maps a prose-string personality (setup-wizard vaults) to a single tone section', () => {
    const v2 = normalizeCompanionIdentity(
      v1({ personality: 'terse but incisive' }),
    );
    const tone = v2?.sections.find((s) => s.key === 'tone');
    expect(tone).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'terse but incisive',
    });
  });

  it('omits sections for absent optional v1 fields', () => {
    const v2 = normalizeCompanionIdentity({ name: 'Nao', greeting: 'Hi' });
    expect(v2?.sections).toEqual([]);
    expect(v2?.name).toBe('Nao');
  });
});

describe('normalizeCompanionIdentity — canonical passthrough + guards', () => {
  it('sanitizes an existing canonical file and clamps salience into 1..5', () => {
    const v2 = normalizeCompanionIdentity({
      schema_version: 2,
      name: 'Nao',
      greeting: 'Hi',
      sections: [
        { key: 'tone', inject: 'both', salience: 9, detail: 'x' },
        { key: 'bad', inject: 'nope', salience: 0, detail: 'y' },
      ],
    });
    const tone = v2?.sections.find((s) => s.key === 'tone');
    const bad = v2?.sections.find((s) => s.key === 'bad');
    expect(tone?.salience).toBe(5);
    expect(bad).toMatchObject({ inject: 'both', salience: 1 });
  });

  it('drops canonical sections missing key or detail', () => {
    const v2 = normalizeCompanionIdentity({
      schema_version: 2,
      name: 'Nao',
      greeting: 'Hi',
      sections: [{ inject: 'both', salience: 3, detail: 'no key' }],
    });
    expect(v2?.sections).toEqual([]);
  });

  it('promotes a transition-era canonical core role into a role section (no duplicate)', () => {
    const bridged = normalizeCompanionIdentity({
      schema_version: 2,
      name: 'Nao',
      role: 'mirror advisor',
      greeting: 'Hi',
      sections: [{ key: 'tone', inject: 'both', salience: 5, detail: 'calm' }],
    });
    expect(bridged?.sections.find((s) => s.key === 'role')).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'mirror advisor',
    });
    const noClobber = normalizeCompanionIdentity({
      schema_version: 2,
      name: 'Nao',
      role: 'core role',
      greeting: 'Hi',
      sections: [{ key: 'role', inject: 'turn', salience: 3, detail: 'kept' }],
    });
    expect(noClobber?.sections.filter((s) => s.key === 'role')).toHaveLength(1);
    expect(noClobber?.sections.find((s) => s.key === 'role')?.detail).toBe(
      'kept',
    );
  });

  it('returns null when name or greeting is missing, or input is not an object', () => {
    expect(normalizeCompanionIdentity({ greeting: 'Hi' })).toBeNull();
    expect(normalizeCompanionIdentity({ name: 'Nao' })).toBeNull();
    expect(normalizeCompanionIdentity(null)).toBeNull();
    expect(normalizeCompanionIdentity('nope')).toBeNull();
  });
});

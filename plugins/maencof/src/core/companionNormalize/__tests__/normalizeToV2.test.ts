import { describe, expect, it } from 'vitest';

import { normalizeToV2 } from '../normalizeToV2.js';

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

describe('normalizeToV2 — v1 field mapping (§7-2)', () => {
  it('maps personality/principles/taboos/origin to sections with the specified inject+salience', () => {
    const v2 = normalizeToV2(v1());
    expect(v2).not.toBeNull();
    const byKey = Object.fromEntries(
      (v2?.sections ?? []).map((s) => [s.key, s]),
    );
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

  it('preserves name/role/greeting/created_at and stamps schema_version 2', () => {
    const v2 = normalizeToV2(v1());
    expect(v2).toMatchObject({
      schema_version: 2,
      name: 'Nao',
      role: 'mirror advisor',
      greeting: 'Welcome back.',
      created_at: '2026-05-06T00:00:00Z',
    });
  });

  it('maps a prose-string personality (setup-wizard vaults) to a single tone section', () => {
    const v2 = normalizeToV2(v1({ personality: 'terse but incisive' }));
    const tone = v2?.sections.find((s) => s.key === 'tone');
    expect(tone).toMatchObject({
      inject: 'both',
      salience: 5,
      detail: 'terse but incisive',
    });
  });

  it('omits sections for absent optional v1 fields', () => {
    const v2 = normalizeToV2({ name: 'Nao', greeting: 'Hi' });
    expect(v2?.sections).toEqual([]);
    expect(v2?.name).toBe('Nao');
  });
});

describe('normalizeToV2 — v2 passthrough + guards', () => {
  it('sanitizes an existing v2 file and clamps salience into 1..5', () => {
    const v2 = normalizeToV2({
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

  it('drops v2 sections missing key or detail', () => {
    const v2 = normalizeToV2({
      schema_version: 2,
      name: 'Nao',
      greeting: 'Hi',
      sections: [{ inject: 'both', salience: 3, detail: 'no key' }],
    });
    expect(v2?.sections).toEqual([]);
  });

  it('returns null when name or greeting is missing, or input is not an object', () => {
    expect(normalizeToV2({ greeting: 'Hi' })).toBeNull();
    expect(normalizeToV2({ name: 'Nao' })).toBeNull();
    expect(normalizeToV2(null)).toBeNull();
    expect(normalizeToV2('nope')).toBeNull();
  });
});

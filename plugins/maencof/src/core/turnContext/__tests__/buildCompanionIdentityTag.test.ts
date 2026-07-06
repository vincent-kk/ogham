import { describe, expect, it } from 'vitest';

import type { CompanionIdentityV2Minimal } from '../../../types/companionGuard.js';
import { buildCompanionIdentityTag } from '../buildCompanionIdentityTag.js';

function identity(
  sections: CompanionIdentityV2Minimal['sections'],
): CompanionIdentityV2Minimal {
  return {
    schema_version: 2,
    name: 'Nao',
    role: 'advisor',
    greeting: 'Hi',
    sections,
  };
}

describe('buildCompanionIdentityTag — binding per-turn render (§4)', () => {
  it('frames the tag as binding rules, not background lore', () => {
    const tag = buildCompanionIdentityTag(
      identity([{ key: 'tone', inject: 'both', salience: 5, detail: 'calm' }]),
    );
    expect(tag).toContain('<companion-identity enforcement="binding">');
    expect(tag).toContain('You are Nao.');
    expect(tag).toContain('not background lore');
    expect(tag).toContain('<tone salience="5">calm</tone>');
    expect(tag).toContain('</companion-identity>');
  });

  it('includes only turn/both sections; excludes session-only sections', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        { key: 'tone', inject: 'turn', salience: 5, detail: 'calm' },
        { key: 'origin', inject: 'session', salience: 1, detail: 'backstory' },
      ]),
    );
    expect(tag).toContain('<tone');
    expect(tag).not.toContain('<origin');
  });

  it('orders sections by salience descending', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        { key: 'low', inject: 'turn', salience: 2, detail: 'a' },
        { key: 'high', inject: 'turn', salience: 5, detail: 'b' },
        { key: 'mid', inject: 'turn', salience: 3, detail: 'c' },
      ]),
    );
    expect(tag.indexOf('<high')).toBeLessThan(tag.indexOf('<mid'));
    expect(tag.indexOf('<mid')).toBeLessThan(tag.indexOf('<low'));
  });

  it('uses brief instead of detail per turn when present', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        {
          key: 'tone',
          inject: 'both',
          salience: 5,
          detail: 'the long canonical form',
          brief: 'short',
        },
      ]),
    );
    expect(tag).toContain('<tone salience="5">short</tone>');
    expect(tag).not.toContain('the long canonical form');
  });

  it('prefixes taboos with NEVER:', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        {
          key: 'taboos',
          inject: 'both',
          salience: 5,
          detail: 'delete originals',
        },
      ]),
    );
    expect(tag).toContain(
      '<taboos salience="5">NEVER: delete originals</taboos>',
    );
  });

  it('returns an empty string when there are no turn/both sections', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        { key: 'origin', inject: 'session', salience: 1, detail: 'backstory' },
      ]),
    );
    expect(tag).toBe('');
  });

  it('keeps a realistic persona render within the 500-char per-turn budget', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        {
          key: 'tone',
          inject: 'both',
          salience: 5,
          detail: 'Calm, concise, structure-first. Lead with the conclusion.',
        },
        {
          key: 'taboos',
          inject: 'both',
          salience: 5,
          detail: 'Never modify or delete original notes without permission.',
        },
        {
          key: 'principles',
          inject: 'both',
          salience: 4,
          detail: 'Retrieval over collection. | Rigorous links. | Brevity.',
        },
        {
          key: 'traits',
          inject: 'turn',
          salience: 3,
          detail: 'logical, systematic, brief',
        },
      ]),
    );
    // Only the section markup + bodies count toward the 500 budget (preamble excluded).
    const sectionChars = tag
      .split('\n')
      .filter((l) => l.trim().startsWith('<') && l.includes('salience='))
      .reduce((sum, l) => sum + [...l.trim()].length, 0);
    expect(sectionChars).toBeLessThanOrEqual(500);
  });
});

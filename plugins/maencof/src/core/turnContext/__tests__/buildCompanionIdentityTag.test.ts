import { describe, expect, it } from 'vitest';

import type { CompanionIdentityMinimal } from '../../../types/companionGuard.js';
import { buildCompanionIdentityTag } from '../buildCompanionIdentityTag.js';

function identity(
  sections: CompanionIdentityMinimal['sections'],
): CompanionIdentityMinimal {
  return {
    schema_version: 2,
    name: 'Nao',
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

  it('joins array detail with | in the rendered body', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        {
          key: 'principles',
          inject: 'both',
          salience: 4,
          detail: ['retrieval', 'links', 'brevity'],
        },
      ]),
    );
    expect(tag).toContain(
      '<principles salience="4">retrieval|links|brevity</principles>',
    );
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

  it('injects role as a per-turn section and keeps a realistic persona within the 500-char budget', () => {
    const tag = buildCompanionIdentityTag(
      identity([
        {
          key: 'role',
          inject: 'both',
          salience: 5,
          detail: 'Knowledge Structuring & Synthesis Partner',
        },
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
    expect(tag).toContain(
      '<role salience="5">Knowledge Structuring & Synthesis Partner</role>',
    );
    // Only the section markup + bodies count toward the 500 budget (preamble excluded).
    const sectionChars = tag
      .split('\n')
      .filter((l) => l.trim().startsWith('<') && l.includes('salience='))
      .reduce((sum, l) => sum + [...l.trim()].length, 0);
    expect(sectionChars).toBeLessThanOrEqual(500);
  });
});

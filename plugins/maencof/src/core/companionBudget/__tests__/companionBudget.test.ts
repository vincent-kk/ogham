import { describe, expect, it } from 'vitest';

import type { CompanionSectionMinimal } from '../../../types/companionGuard.js';
import { renderIdentitySection } from '../../turnContext/renderIdentitySection.js';
import {
  assertSessionBudget,
  assertTurnBudget,
  checkBriefSubsumption,
  measureSessionChars,
  measureTurnChars,
} from '../companionBudget.js';

function section(
  over?: Partial<CompanionSectionMinimal>,
): CompanionSectionMinimal {
  return { key: 'tone', inject: 'both', salience: 5, detail: 'calm', ...over };
}

describe('measureTurnChars', () => {
  it('sums only turn/both sections and matches the renderer exactly', () => {
    const sections = [
      section({ key: 'tone', inject: 'both', detail: 'calm' }),
      section({ key: 'approach', inject: 'turn', detail: 'structured' }),
      section({
        key: 'origin',
        inject: 'session',
        salience: 1,
        detail: 'a long backstory',
      }),
    ];
    const expected =
      [...renderIdentitySection(sections[0], { useBrief: true })].length +
      [...renderIdentitySection(sections[1], { useBrief: true })].length;
    expect(measureTurnChars(sections)).toBe(expected);
  });

  it('uses brief (not detail) for the per-turn measure when brief is present', () => {
    const withBrief = section({ detail: 'a'.repeat(80), brief: 'short' });
    const withoutBrief = section({ detail: 'a'.repeat(80) });
    expect(measureTurnChars([withBrief])).toBeLessThan(
      measureTurnChars([withoutBrief]),
    );
  });
});

describe('assertTurnBudget — 500 gate (§3.1)', () => {
  it('flags an over-budget per-turn set and reports offenders largest-first', () => {
    const sections = [
      section({ key: 'a', detail: 'a'.repeat(300) }),
      section({ key: 'b', detail: 'b'.repeat(250) }),
    ];
    const result = assertTurnBudget(sections);
    expect(result.ok).toBe(false);
    expect(result.overBy).toBeGreaterThan(0);
    expect(result.offenders[0].key).toBe('a');
    expect(result.offenders[0].chars).toBeGreaterThanOrEqual(
      result.offenders[1].chars,
    );
  });

  it('passes a small per-turn set and never cuts by salience (all sections counted)', () => {
    const sections = [
      section({ key: 'a', salience: 1, detail: 'x' }),
      section({ key: 'b', salience: 5, detail: 'y' }),
    ];
    const result = assertTurnBudget(sections);
    expect(result.ok).toBe(true);
    expect(result.offenders).toHaveLength(2);
  });
});

describe('assertSessionBudget + measureSessionChars', () => {
  it('measures session/both sections with full detail (ignores brief)', () => {
    const s = section({ inject: 'both', detail: 'a'.repeat(40), brief: 'x' });
    // session uses detail → larger than the turn (brief) measure
    expect(measureSessionChars([s])).toBeGreaterThan(measureTurnChars([s]));
    expect(assertSessionBudget([section()]).ok).toBe(true);
  });
});

describe('checkBriefSubsumption — length inversion guard (§5)', () => {
  it('warns when brief is not shorter than detail', () => {
    expect(
      checkBriefSubsumption(
        section({ detail: 'short', brief: 'a much longer brief' }),
      ).ok,
    ).toBe(false);
  });

  it('passes when brief is shorter, or when brief is absent', () => {
    expect(
      checkBriefSubsumption(
        section({ detail: 'a longer detail', brief: 'short' }),
      ).ok,
    ).toBe(true);
    expect(checkBriefSubsumption(section({ detail: 'no brief here' })).ok).toBe(
      true,
    );
  });

  it('compares joined lengths when brief/detail are arrays', () => {
    // joined brief 'a|b' (3) < joined detail 'aaa|bbb|ccc' (11) → ok
    expect(
      checkBriefSubsumption(
        section({ detail: ['aaa', 'bbb', 'ccc'], brief: ['a', 'b'] }),
      ).ok,
    ).toBe(true);
    // joined brief longer than joined detail → warns
    expect(
      checkBriefSubsumption(
        section({ detail: ['x'], brief: ['longer', 'than', 'detail'] }),
      ).ok,
    ).toBe(false);
  });
});

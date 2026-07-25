import { describe, expect, it } from 'vitest';

import { nudgeLine } from '../utils/nudgeLine.js';
import { providerList } from '../utils/providerList.js';

describe('providerList', () => {
  it('renders a single provider as-is', () => {
    expect(providerList(['codex'])).toBe('codex');
  });

  it('joins two providers with or', () => {
    expect(providerList(['codex', 'antigravity'])).toBe('codex or antigravity');
  });

  it('joins three providers with a serial comma', () => {
    expect(providerList(['codex', 'antigravity', 'claude'])).toBe(
      'codex, antigravity, or claude',
    );
  });
});

describe('nudgeLine', () => {
  const two = ['codex', 'antigravity'] as const;

  it('at -2 delegates only on an explicit ask', () => {
    expect(nudgeLine(-2, two)).toBe(
      'Delegate to codex or antigravity only when asked by name.',
    );
  });

  it('at -1 requires the provider to own most of the work', () => {
    expect(nudgeLine(-1, two)).toContain('owns most of this work');
  });

  it('at 0 forces the decision before the work starts', () => {
    expect(nudgeLine(0, two)).toContain('decide before you start');
  });

  it('at +1 prefers the provider over local work', () => {
    expect(nudgeLine(1, two)).toContain('Prefer codex or antigravity');
  });

  it('at +2 points at the listed exceptions rather than a free reason', () => {
    const line = nudgeLine(2, two);
    expect(line).toContain('needs a listed exception');
    expect(line).not.toContain('stated reason');
  });

  it('names the electable providers and stays one short line', () => {
    for (const s of [-2, -1, 0, 1, 2] as const) {
      const line = nudgeLine(s, two);
      expect(line).toContain('codex or antigravity');
      expect(line).not.toContain('<provider>');
      expect(line).not.toContain('\n');
      expect(line.length).toBeLessThanOrEqual(110);
    }
  });
});

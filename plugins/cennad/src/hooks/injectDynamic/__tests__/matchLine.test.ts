import { describe, expect, it } from 'vitest';

import { matchLine } from '../utils/matchLine.js';

const match = { provider: 'codex', keyword: '리팩터' } as const;

describe('matchLine', () => {
  it('at +2 tells the session to dispatch before starting', () => {
    expect(matchLine(2, match)).toBe(
      'Matched "리팩터" → /cennad:codex owns this. Dispatch before starting.',
    );
  });

  it('at +1 marks the owner as the preferred route', () => {
    expect(matchLine(1, match)).toContain('owns this. Prefer it.');
  });

  it('at 0 asks for a decision before the work starts', () => {
    expect(matchLine(0, match)).toContain('or here? Decide before starting.');
  });

  it('at -1 keeps the owner conditional', () => {
    expect(matchLine(-1, match)).toContain('if it owns most of this.');
  });

  it('at -2 only notes availability', () => {
    expect(matchLine(-2, match)).toContain('available.');
  });

  it('names the matched keyword and its owning skill at every strength', () => {
    for (const s of [-2, -1, 0, 1, 2] as const) {
      const line = matchLine(s, match);
      expect(line).toContain('"리팩터"');
      expect(line).toContain('/cennad:codex');
      expect(line).not.toContain('\n');
    }
  });
});

import { describe, expect, it } from 'vitest';

import { matchExpect } from '../utils/matchExpect.js';

// filid:contract AC-gates-literal-expect
describe('literal EXPECT matching', () => {
  it.each([
    {
      name: 'does not interpret a numeric output pattern',
      marker: '/\\d+\\/\\d+ passed/',
      output: '15/15 passed',
      expected: { matched: false },
    },
    {
      name: 'does not apply regex flags',
      marker: '/^CHECK_OK$/i',
      output: 'check_ok',
      expected: { matched: false },
    },
    {
      name: 'matches slash-delimited metacharacters literally',
      marker: '/^CHECK_OK$/i',
      output: 'starting\n/^CHECK_OK$/i\nfinished',
      expected: { matched: true, line: '/^CHECK_OK$/i' },
    },
    {
      name: 'returns the first line containing a marker',
      marker: 'CHECK_OK',
      output: 'starting\nfirst CHECK_OK result\nsecond CHECK_OK result',
      expected: { matched: true, line: 'first CHECK_OK result' },
    },
    {
      name: 'keeps matching case-sensitive',
      marker: 'CHECK_OK',
      output: 'check_ok',
      expected: { matched: false },
    },
    {
      name: 'trims marker boundary whitespace',
      marker: ' \tCHECK_OK ',
      output: 'CHECK_OK',
      expected: { matched: true, line: 'CHECK_OK' },
    },
    {
      name: 'does not match across output lines',
      marker: 'CHECK\nOK',
      output: 'CHECK\nOK',
      expected: { matched: false },
    },
  ])('$name', ({ marker, output, expected }) => {
    expect(matchExpect(marker, output)).toEqual(expected);
  });
});

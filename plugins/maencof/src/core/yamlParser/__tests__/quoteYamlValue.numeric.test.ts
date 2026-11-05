/** @file quoteYamlValue.numeric.test.ts 숫자꼴 문자열 직렬화 왕복 회귀 검사. */
import { describe, expect, it } from 'vitest';

import { parseScalarValue } from '../operations/parseScalarValue.js';
import { quoteYamlValue } from '../operations/quoteYamlValue.js';

describe('quoteYamlValue numeric-looking strings', () => {
  it.each([
    'Infinity',
    '+Infinity',
    '-Infinity',
    '0x10',
    '0XCAFE',
    '0b11',
    '0B11',
    '0o17',
    '0O17',
    '42 ',
    '1e309',
    '\t',
  ])('round-trips %j as a string', (value) => {
    expect(parseScalarValue(quoteYamlValue(value))).toBe(value);
    expect(quoteYamlValue(value)).toMatch(/^".*"$/s);
  });

  it('keeps non-numeric plain strings unquoted', () => {
    for (const value of ['NaN', '0xinvalid', '0b2', '0o8', 'infinity']) {
      expect(quoteYamlValue(value)).toBe(value);
      expect(parseScalarValue(quoteYamlValue(value))).toBe(value);
    }
  });
});

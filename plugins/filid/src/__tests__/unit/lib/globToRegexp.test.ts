import { describe, expect, it } from 'vitest';

import { globToRegExp } from '../../../lib/globToRegexp.js';

/** A file name a filesystem allows but a line-oriented reader cannot carry. */
const NEWLINE_NAME = ['src/two', 'lines.ts'].join(String.fromCharCode(10));

describe('globToRegExp', () => {
  it('matches a newline-bearing name under ** as it does under *', () => {
    // These two disagreeing is what made one file in scope by one pattern and
    // out by another, which decided whether it was analysed at all.
    expect(globToRegExp('src/**').test(NEWLINE_NAME)).toBe(true);
    expect(globToRegExp('src/*').test(NEWLINE_NAME)).toBe(true);
    expect(globToRegExp('**').test(NEWLINE_NAME)).toBe(true);
  });

  it('still keeps * inside one path segment', () => {
    expect(globToRegExp('src/*').test('src/a.ts')).toBe(true);
    expect(globToRegExp('src/*').test('src/nested/a.ts')).toBe(false);
  });

  it('still lets ** cross separators', () => {
    expect(globToRegExp('src/**').test('src/deeply/nested/a.ts')).toBe(true);
  });

  it('anchors the whole path', () => {
    expect(globToRegExp('src/*.ts').test('other/src/a.ts')).toBe(false);
  });

  it('treats regex metacharacters in a pattern as literal text', () => {
    expect(globToRegExp('src/a.ts').test('src/axts')).toBe(false);
    expect(globToRegExp('src/a.ts').test('src/a.ts')).toBe(true);
  });
});

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

describe('a recursive wildcard spans zero segments', () => {
  it('matches a root-level file, not only one under a directory', () => {
    // The defect this closes: the separator written after `**` was compiled
    // literally, so a default scope of source-extension globs silently left
    // every root-level file out — reported `unsupported`, never missing.
    const pattern = globToRegExp('**/*.ts');

    expect(pattern.test('index.ts')).toBe(true);
    expect(pattern.test('src/index.ts')).toBe(true);
    expect(pattern.test('src/deep/index.ts')).toBe(true);
    expect(pattern.test('index.tsx')).toBe(false);
  });

  it('spans zero segments in the middle of a pattern too', () => {
    const pattern = globToRegExp('src/**/index.ts');

    expect(pattern.test('src/index.ts')).toBe(true);
    expect(pattern.test('src/a/index.ts')).toBe(true);
    expect(pattern.test('src/a/b/index.ts')).toBe(true);
    expect(pattern.test('other/index.ts')).toBe(false);
  });

  it('leaves a trailing recursive wildcard as it was', () => {
    const pattern = globToRegExp('src/**');

    expect(pattern.test('src/index.ts')).toBe(true);
    expect(pattern.test('src/a/index.ts')).toBe(true);
    // Unchanged on purpose: it matched the directory's contents before and
    // matches exactly those now.
    expect(pattern.test('src')).toBe(false);
  });

  it('still keeps a single star inside one segment', () => {
    expect(globToRegExp('**/*.ts').test('src/a/b.ts')).toBe(true);
    expect(globToRegExp('src/*.ts').test('src/a/b.ts')).toBe(false);
    expect(globToRegExp('src/*/b.ts').test('src/a/b.ts')).toBe(true);
  });

  it('still matches a name holding a newline', () => {
    expect(globToRegExp('**/*.ts').test('src/a\nb.ts')).toBe(true);
    expect(globToRegExp('**/*.ts').test('a\nb.ts')).toBe(true);
  });

  it('spans zero segments across consecutive recursive wildcards', () => {
    // The defect this closes: a global replace consumed the first `**/`,
    // leaving the second without the `^`/`/` the pattern required, so it fell
    // through to the literal-`/` branch and could no longer match zero
    // segments — dropping every root-level file out of scope silently.
    const pattern = globToRegExp('**/**/*.ts');

    expect(pattern.test('a.ts')).toBe(true);
    expect(pattern.test('x/a.ts')).toBe(true);
    expect(pattern.test('x/y/a.ts')).toBe(true);

    expect(globToRegExp('a/**/**/b').test('a/b')).toBe(true);
  });
});

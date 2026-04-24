/**
 * @file is-exempt.test.ts
 * @description Unit coverage for the throw-safe exempt matcher (Commit B).
 * AC10a anchor — invalid glob syntax must not propagate as an exception.
 */
import { describe, expect, it } from 'vitest';

import { isExempt } from '../../../core/rules/rule-engine/utils/is-exempt.js';

const node = { path: 'packages/filid/src/index.ts' };

describe('isExempt (basic)', () => {
  it('returns false when patterns are undefined or empty', () => {
    expect(isExempt(node, undefined)).toBe(false);
    expect(isExempt(node, [])).toBe(false);
  });

  it('matches a recursive ** glob at any depth', () => {
    expect(isExempt(node, ['packages/**'])).toBe(true);
    expect(isExempt({ path: 'src/legacy/foo/bar.ts' }, ['src/legacy/**'])).toBe(
      true,
    );
  });

  it('matches a literal path exactly', () => {
    expect(isExempt(node, ['packages/filid/src/index.ts'])).toBe(true);
    expect(isExempt(node, ['packages/filid/src/other.ts'])).toBe(false);
  });
});

describe('isExempt (edge)', () => {
  it('returns false and does not throw on invalid glob syntax (AC10a)', () => {
    expect(() => isExempt(node, ['[invalid glob'])).not.toThrow();
    expect(isExempt(node, ['[invalid glob'])).toBe(false);
    expect(() => isExempt(node, ['**/unclosed['])).not.toThrow();
    expect(isExempt(node, ['**/unclosed['])).toBe(false);
  });

  it('single * does not cross path separators', () => {
    expect(isExempt({ path: 'packages/foo' }, ['packages/*'])).toBe(true);
    expect(isExempt({ path: 'packages/foo/bar' }, ['packages/*'])).toBe(false);
  });

  it('supports ? single-character wildcards', () => {
    expect(isExempt({ path: 'packages/ab' }, ['packages/??'])).toBe(true);
    expect(isExempt({ path: 'packages/abc' }, ['packages/??'])).toBe(false);
  });

  it('returns true only for the first matching pattern in a list', () => {
    const patterns = ['src/legacy/**', 'packages/**'];
    expect(isExempt(node, patterns)).toBe(true);
  });

  it('ignores non-string / empty-string entries defensively', () => {
    expect(
      isExempt(node, [
        '',
        'packages/**',
      ]),
    ).toBe(true);
  });

  it('accepts a FractalNode-shaped target via duck typing', () => {
    const fractalShaped = {
      path: 'packages/filid',
      name: 'filid',
      type: 'fractal' as const,
      parent: 'packages',
      children: [],
      organs: [],
      hasIntentMd: true,
      hasDetailMd: false,
      hasIndex: true,
      hasMain: false,
      depth: 2,
      metadata: {},
    };
    expect(isExempt(fractalShaped, ['packages/**'])).toBe(true);
  });

  it('literal pattern does not match when isDynamicPattern=false and path differs', () => {
    expect(isExempt({ path: 'foo/bar' }, ['foo/baz'])).toBe(false);
  });

  it('does not match subpath when pattern lacks /**', () => {
    expect(isExempt({ path: 'packages/foo/bar' }, ['packages/foo'])).toBe(
      false,
    );
  });

  it('matches path with literal dot in segment (regex-escape safety)', () => {
    expect(
      isExempt({ path: 'src/index.test.ts' }, ['src/index.test.ts']),
    ).toBe(true);
    expect(isExempt({ path: 'src/indexXtestXts' }, ['src/index.test.ts'])).toBe(
      false,
    );
  });

  it('empty path never matches non-empty glob', () => {
    expect(isExempt({ path: '' }, ['**/foo'])).toBe(false);
  });

  it('multiple ** segments in a single pattern', () => {
    expect(
      isExempt({ path: 'packages/foo/src/legacy/a.ts' }, [
        'packages/**/legacy/**',
      ]),
    ).toBe(true);
  });
});

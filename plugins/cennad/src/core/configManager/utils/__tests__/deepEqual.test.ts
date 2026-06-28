import { describe, expect, it } from 'vitest';

import { deepEqual } from '../deepEqual.js';

describe('deepEqual', () => {
  it('compares primitives by value', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('treats objects as equal regardless of key order', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('detects a differing nested value', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('detects an extra key', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('compares arrays positionally', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('does not treat an array as equal to a plain object', () => {
    expect(deepEqual([], {})).toBe(false);
  });

  it('compares deeply nested mixed structures', () => {
    const a = { list: [{ x: 1 }, { y: [2, 3] }], n: null };
    const b = { n: null, list: [{ x: 1 }, { y: [2, 3] }] };
    expect(deepEqual(a, b)).toBe(true);
  });
});

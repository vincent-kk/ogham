import { describe, expect, it } from 'vitest';

import { isPlainObject } from '../isPlainObject.js';

describe('isPlainObject', () => {
  it('returns true for a plain object literal', () => {
    expect(isPlainObject({ key: 'value' })).toBe(true);
  });

  it('returns true for an empty plain object', () => {
    expect(isPlainObject({})).toBe(true);
  });

  it('returns true for Object.create(null) (no prototype)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('returns true for a class instance (typeof object, not excluded)', () => {
    class Foo {}
    expect(isPlainObject(new Foo())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isPlainObject('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isPlainObject(42)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isPlainObject(false)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { compressPaths } from '../../../hooks/pre-tool-use/helpers/intent-injector/utils/compress-paths.js';

describe('compressPaths', () => {
  // --- Extracted from intent-injector.test.ts (6 existing tests) ---

  it('empty array → empty string', () => {
    expect(compressPaths([])).toBe('');
  });

  it('single path → returns path unchanged', () => {
    expect(compressPaths(['src/auth'])).toBe('src/auth');
  });

  it('two paths with common prefix → brace notation', () => {
    const result = compressPaths([
      'src/payment/checkout',
      'src/payment/refund',
    ]);
    expect(result).toContain('payment');
    expect(result).toContain('checkout');
    expect(result).toContain('refund');
    expect(result).toMatch(/\{.*checkout.*refund.*\}|checkout.*refund/);
  });

  it('paths with no common prefix → comma-joined', () => {
    const result = compressPaths(['src/auth', 'src/payment']);
    expect(result).toContain('auth');
    expect(result).toContain('payment');
  });

  it('currentDir marked with * suffix', () => {
    const result = compressPaths(['src/auth', 'src/payment'], 'src/auth');
    expect(result).toContain('auth/*');
  });

  it('single path matching currentDir → adds * suffix', () => {
    expect(compressPaths(['src/auth'], 'src/auth')).toBe('src/auth/*');
  });

  // --- New deep nesting tests ---

  it('3-level deep nesting → nested brace expansion', () => {
    const result = compressPaths(['src/a/b/c', 'src/a/b/d', 'src/a/e']);
    // Expected: src/{a/{b/{c,d},e}}
    expect(result).toBe('src/{a/{b/{c,d},e}}');
  });

  it('mixed depths → all paths preserved', () => {
    const result = compressPaths(['src/a/b/c', 'src/a', 'src/a/b']);
    // src/a appears as both a leaf and a prefix
    expect(result).toContain('a');
    expect(result).toContain('b');
    expect(result).toContain('c');
  });

  it('4-level with multiple branching → deeply nested brace expansion', () => {
    const result = compressPaths([
      'pkg/a/b/c/d',
      'pkg/a/b/c/e',
      'pkg/a/b/f',
      'pkg/a/g',
    ]);
    // Expected: pkg/{a/{b/{c/{d,e},f},g}}
    expect(result).toBe('pkg/{a/{b/{c/{d,e},f},g}}');
  });
});

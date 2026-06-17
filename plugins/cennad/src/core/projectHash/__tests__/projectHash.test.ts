import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { getProjectHash } from '../projectHash.js';

describe('getProjectHash', () => {
  it('returns 12 hex characters', () => {
    const hash = getProjectHash('/Users/example/repo');
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
  });

  it('is deterministic for the same cwd', () => {
    expect(getProjectHash('/a/b/c')).toBe(getProjectHash('/a/b/c'));
  });

  it('differs across distinct cwds', () => {
    expect(getProjectHash('/a/b/c')).not.toBe(getProjectHash('/a/b/d'));
  });

  it('matches the first 12 chars of sha256(cwd)', () => {
    const cwd = '/some/project';
    const expected = createHash('sha256')
      .update(cwd)
      .digest('hex')
      .slice(0, 12);
    expect(getProjectHash(cwd)).toBe(expected);
  });
});

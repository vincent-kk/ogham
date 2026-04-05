import { describe, expect, it } from 'vitest';

import { assertUnder } from '../../../mcp/tools/utils/fs-guard.js';

describe('assertUnder', () => {
  const parent = '/project/.filid/debt';

  describe('containment holds (happy paths)', () => {
    it('allows an exact child file under the parent dir', () => {
      const result = assertUnder(parent, '/project/.filid/debt/FIX-001.md');
      expect(result).toBe('/project/.filid/debt/FIX-001.md');
    });

    it('allows a nested child under the parent dir', () => {
      const result = assertUnder(parent, '/project/.filid/debt/sub/FIX-2.md');
      expect(result).toBe('/project/.filid/debt/sub/FIX-2.md');
    });

    it('allows the parent dir itself', () => {
      const result = assertUnder(parent, '/project/.filid/debt');
      expect(result).toBe('/project/.filid/debt');
    });
  });

  describe('traversal rejection (containment violated)', () => {
    it('rejects ../ escape from the parent dir', () => {
      expect(() =>
        assertUnder(parent, '/project/.filid/debt/../../../etc/passwd'),
      ).toThrow(/traversal detected/);
    });

    it('rejects an unrelated absolute path', () => {
      expect(() => assertUnder(parent, '/etc/passwd')).toThrow(
        /traversal detected/,
      );
    });

    it('rejects a sibling directory whose prefix matches as a string', () => {
      // `debt-backdoor` is a string-prefix of `debt` but not a child.
      expect(() =>
        assertUnder(parent, '/project/.filid/debt-backdoor/x.md'),
      ).toThrow(/traversal detected/);
    });

    it('rejects a path built from a crafted debtId (../../etc/passwd)', () => {
      const craftedFilePath = '/project/.filid/debt/../../etc/passwd.md';
      expect(() => assertUnder(parent, craftedFilePath)).toThrow(
        /traversal detected/,
      );
    });
  });

  describe('path normalization', () => {
    it('normalizes relative parent dirs consistently with target', () => {
      const relParent = './tmp/guard-test';
      const relTarget = './tmp/guard-test/child.md';
      const result = assertUnder(relParent, relTarget);
      expect(result.endsWith('tmp/guard-test/child.md')).toBe(true);
    });

    it('error message includes the resolved parent dir', () => {
      try {
        assertUnder(parent, '/etc/passwd');
        expect.unreachable('expected assertUnder to throw');
      } catch (err) {
        expect((err as Error).message).toContain('/project/.filid/debt');
      }
    });
  });
});

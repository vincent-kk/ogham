import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

const { isFcaProject, isIntentMd, isDetailMd, isCriteriaMd } =
  await import('../../../hooks/shared/shared.js');
const { existsSync } = await import('node:fs');

describe('shared hooks utilities', () => {
  describe('isFcaProject', () => {
    it('should return true when .filid directory exists', () => {
      (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
        (p: unknown) => {
          if (typeof p === 'string' && p.endsWith('.filid')) return true;
          return false;
        },
      );
      expect(isFcaProject('/workspace/project')).toBe(true);
    });

    it('should return true when only INTENT.md exists', () => {
      (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
        (p: unknown) => {
          if (typeof p === 'string' && p.endsWith('INTENT.md')) return true;
          return false;
        },
      );
      expect(isFcaProject('/workspace/project')).toBe(true);
    });

    it('should return false when no FCA indicators exist', () => {
      (existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);
      expect(isFcaProject('/workspace/project')).toBe(false);
    });

    it('should walk up to an ancestor marker from a subdirectory', () => {
      const marker = join('/workspace/project', '.filid');
      (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
        (p: unknown) => p === marker,
      );
      expect(isFcaProject('/workspace/project/packages/pkg')).toBe(true);
    });

    it('should stop at the git root and ignore a marker above it', () => {
      const outerMarker = join('/outer', '.filid');
      const gitRoot = join('/outer/repo', '.git');
      (existsSync as ReturnType<typeof vi.fn>).mockImplementation(
        (p: unknown) => p === outerMarker || p === gitRoot,
      );
      expect(isFcaProject('/outer/repo/sub')).toBe(false);
    });
  });

  describe('isIntentMd', () => {
    it('should return true for INTENT.md paths', () => {
      expect(isIntentMd('/app/INTENT.md')).toBe(true);
      expect(isIntentMd('INTENT.md')).toBe(true);
    });

    it('should return false for other file paths', () => {
      expect(isIntentMd('/app/README.md')).toBe(false);
      expect(isIntentMd('/app/intent.md')).toBe(false);
      expect(isIntentMd('/app/DETAIL.md')).toBe(false);
    });

    it('should handle Windows-style backslash paths', () => {
      expect(isIntentMd('C:\\app\\INTENT.md')).toBe(true);
      expect(isIntentMd('C:\\app\\src\\INTENT.md')).toBe(true);
      expect(isIntentMd('C:\\app\\README.md')).toBe(false);
    });
  });

  describe('isDetailMd', () => {
    it('should return true for DETAIL.md paths', () => {
      expect(isDetailMd('/app/DETAIL.md')).toBe(true);
      expect(isDetailMd('DETAIL.md')).toBe(true);
    });

    it('should return false for other file paths', () => {
      expect(isDetailMd('/app/README.md')).toBe(false);
      expect(isDetailMd('/app/spec.md')).toBe(false);
      expect(isDetailMd('/app/SPEC.md')).toBe(false);
      expect(isDetailMd('/app/INTENT.md')).toBe(false);
    });

    it('should handle Windows-style backslash paths', () => {
      expect(isDetailMd('C:\\app\\DETAIL.md')).toBe(true);
      expect(isDetailMd('C:\\app\\src\\DETAIL.md')).toBe(true);
      expect(isDetailMd('C:\\app\\INTENT.md')).toBe(false);
    });
  });

  describe('isCriteriaMd', () => {
    it('should match the ledger via absolute, relative, and backslash paths', () => {
      expect(isCriteriaMd('/repo/.filid/criteria.md')).toBe(true);
      expect(isCriteriaMd('.filid/criteria.md')).toBe(true);
      expect(isCriteriaMd('C:\\repo\\.filid\\criteria.md')).toBe(true);
    });

    it('should resolve denormalized segments (//, /./, ..) before matching', () => {
      expect(isCriteriaMd('/repo/.filid//criteria.md')).toBe(true);
      expect(isCriteriaMd('/repo/.filid/./criteria.md')).toBe(true);
      expect(isCriteriaMd('/repo/x/../.filid/criteria.md')).toBe(true);
      expect(isCriteriaMd('/repo/.filid/../docs/criteria.md')).toBe(false);
    });

    it('should reject lookalikes outside .filid or with different names', () => {
      expect(isCriteriaMd('/repo/criteria.md')).toBe(false);
      expect(isCriteriaMd('/repo/.filid/criteria.markdown')).toBe(false);
      expect(isCriteriaMd('/repo/.filid/Criteria.md')).toBe(false);
    });
  });
});

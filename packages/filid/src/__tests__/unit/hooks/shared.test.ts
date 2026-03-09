import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

const { isFcaProject, isIntentMd, isDetailMd } = await import(
  '../../../hooks/shared.js'
);
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
  });
});

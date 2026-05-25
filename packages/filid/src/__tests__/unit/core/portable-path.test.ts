import { describe, expect, it } from 'vitest';

import {
  portableBasename,
  portableResolve,
  samePath,
} from '../../../core/infra/path/portable-path.js';

describe('portable path helpers', () => {
  describe('basename', () => {
    it('uses Windows separators for drive-letter paths on POSIX runners', () => {
      expect(portableBasename('C:\\repo\\src\\file.ts')).toBe('file.ts');
    });

    it('uses Windows separators for UNC paths on POSIX runners', () => {
      expect(portableBasename('\\\\server\\share\\src\\file.ts')).toBe(
        'file.ts',
      );
    });

    it('keeps POSIX absolute paths on the POSIX path API', () => {
      expect(portableBasename('/repo/src/file.ts')).toBe('file.ts');
    });
  });

  describe('resolve', () => {
    it('resolves Windows drive-letter paths as Windows paths on POSIX runners', () => {
      expect(portableResolve('C:\\repo', 'src\\file.ts')).toBe(
        'C:\\repo\\src\\file.ts',
      );
    });
  });

  describe('samePath', () => {
    it('compares Windows-like paths case-insensitively', () => {
      expect(samePath('C:\\Project\\.filid', 'c:\\project\\.filid')).toBe(
        true,
      );
    });

    it('keeps POSIX path comparison case-sensitive', () => {
      expect(samePath('/Project/.filid', '/project/.filid')).toBe(false);
    });
  });
});

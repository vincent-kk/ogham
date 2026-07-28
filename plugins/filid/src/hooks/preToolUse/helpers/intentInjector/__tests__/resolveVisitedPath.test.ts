import { describe, expect, it } from 'vitest';

import { resolveVisitedPath } from '../utils/resolveVisitedPath.js';

const POSIX_CWD = '/repo';
const POSIX_RELATIVE_FILE = 'src/file.ts';
const POSIX_ABSOLUTE_FILE = '/repo/src/file.ts';
const POSIX_PARENT = '/repo/src';
const WINDOWS_CWD = String.raw`C:\repo`;
const WINDOWS_RELATIVE_FILE = String.raw`src\file.ts`;
const WINDOWS_ABSOLUTE_FILE = String.raw`C:\repo\src\file.ts`;
const WINDOWS_PARENT = String.raw`C:\repo\src`;

describe('resolveVisitedPath', () => {
  it('resolves a POSIX relative file and its parent', () => {
    expect(resolveVisitedPath(POSIX_CWD, POSIX_RELATIVE_FILE)).toEqual({
      filePath: POSIX_ABSOLUTE_FILE,
      fileDir: POSIX_PARENT,
    });
  });

  it('resolves a Windows relative file on a POSIX test host', () => {
    expect(resolveVisitedPath(WINDOWS_CWD, WINDOWS_RELATIVE_FILE)).toEqual({
      filePath: WINDOWS_ABSOLUTE_FILE,
      fileDir: WINDOWS_PARENT,
    });
  });
});

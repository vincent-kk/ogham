/**
 * @file isVaultDocDirectory.ts
 * @description vault 루트 또는 문서 디렉토리인지 판별한다 (내부 관리 디렉토리 제외).
 */
import { isAbsolute, relative, resolve } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { INTERNAL_DIRS } from './internalDirs.js';

/**
 * vault 루트 또는 문서 디렉토리인지 판별한다 (내부 관리 디렉토리 제외).
 * Glob의 path (검색 디렉토리) 검사에 사용된다.
 */
export function isVaultDocDirectory(cwd: string, dirPath: string): boolean {
  const resolvedCwd = resolve(cwd);
  const absPath = resolve(resolvedCwd, dirPath);
  const relPath = normalize(relative(resolvedCwd, absPath));

  // vault 루트이거나 하위 디렉토리여야 함
  if (relPath === '..' || relPath.startsWith('../') || isAbsolute(relPath))
    return false;

  // 내부 관리 디렉토리 제외
  if (relPath !== '')
    for (const dir of INTERNAL_DIRS)
      if (relPath.startsWith(dir + '/') || relPath === dir) return false;

  return true;
}

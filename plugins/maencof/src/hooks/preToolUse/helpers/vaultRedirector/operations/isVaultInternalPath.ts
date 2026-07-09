/**
 * @file isVaultInternalPath.ts
 * @description vault 내부 마크다운 파일인지 판별한다.
 */
import { isAbsolute, relative, resolve } from 'node:path';

import { normalize } from '@ogham/cross-platform/paths';

import { INTERNAL_DIRS } from './internalDirs.js';

/**
 * vault 내부 마크다운 파일인지 판별한다.
 */
export function isVaultInternalPath(cwd: string, filePath: string): boolean {
  const resolvedCwd = resolve(cwd);
  const absPath = resolve(resolvedCwd, filePath);
  const relPath = normalize(relative(resolvedCwd, absPath));

  if (
    relPath === '' ||
    relPath === '..' ||
    relPath.startsWith('../') ||
    isAbsolute(relPath)
  )
    return false;

  for (const dir of INTERNAL_DIRS)
    if (relPath.startsWith(dir + '/') || relPath === dir) return false;

  if (!absPath.endsWith('.md')) return false;

  return true;
}

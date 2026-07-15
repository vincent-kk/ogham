/**
 * @file isVaultDocDirectory.ts
 * @description vault 루트 또는 문서 디렉토리인지 판별한다 (내부 관리 디렉토리 제외).
 */
import { isAbsolute } from 'node:path';

import {
  normalize,
  pathForCompare,
  portableRelative,
  portableResolve,
} from '@ogham/cross-platform/paths';

import { INTERNAL_DIRS } from './internalDirs.js';

/**
 * vault 루트 또는 문서 디렉토리인지 판별한다 (내부 관리 디렉토리 제외).
 * Glob의 path (검색 디렉토리) 검사에 사용된다.
 *
 * 경로 연산은 portable* 로 처리해 실행 OS 와 무관하게 결정적이며, 내부 관리
 * 디렉토리 제외는 절대경로를 `pathForCompare` 로 비교해 Windows 에서 대소문자
 * 차이가 있어도 매칭된다.
 */
export function isVaultDocDirectory(cwd: string, dirPath: string): boolean {
  const resolvedCwd = portableResolve(cwd);
  const absPath = portableResolve(resolvedCwd, dirPath);
  const relPath = normalize(portableRelative(resolvedCwd, absPath));

  // vault 루트이거나 하위 디렉토리여야 함
  if (relPath === '..' || relPath.startsWith('../') || isAbsolute(relPath))
    return false;

  // 내부 관리 디렉토리 제외
  if (relPath !== '') {
    const absKey = pathForCompare(absPath);
    for (const dir of INTERNAL_DIRS) {
      const dirKey = pathForCompare(portableResolve(resolvedCwd, dir));
      if (absKey === dirKey || absKey.startsWith(dirKey + '/')) return false;
    }
  }

  return true;
}

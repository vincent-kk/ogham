/**
 * @file isVaultInternalPath.ts
 * @description vault 내부 마크다운 파일인지 판별한다.
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
 * vault 내부 마크다운 파일인지 판별한다.
 *
 * 경로 연산은 네이티브 `path` 가 아니라 portable* 로 처리해 실행 OS 와 무관하게
 * 결정적이다. 내부 관리 디렉토리(.maencof / .maencof-meta) 제외는 절대경로를
 * `pathForCompare` 로 비교한다 — Windows(대소문자 무시 FS)에서 `.Maencof-Meta`
 * 같은 표기가 같은 디렉토리를 가리켜도 매칭되도록.
 */
export function isVaultInternalPath(cwd: string, filePath: string): boolean {
  const resolvedCwd = portableResolve(cwd);
  const absPath = portableResolve(resolvedCwd, filePath);
  const relPath = normalize(portableRelative(resolvedCwd, absPath));

  if (
    relPath === '' ||
    relPath === '..' ||
    relPath.startsWith('../') ||
    isAbsolute(relPath)
  )
    return false;

  const absKey = pathForCompare(absPath);
  for (const dir of INTERNAL_DIRS) {
    const dirKey = pathForCompare(portableResolve(resolvedCwd, dir));
    if (absKey === dirKey || absKey.startsWith(dirKey + '/')) return false;
  }

  if (!absPath.endsWith('.md')) return false;

  return true;
}

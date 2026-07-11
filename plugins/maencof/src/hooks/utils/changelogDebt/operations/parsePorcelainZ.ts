/**
 * @file parsePorcelainZ.ts
 * @description `git status --porcelain -z` 출력을 PorcelainEntry 목록으로 파싱한다.
 */
import type { PorcelainEntry } from '../types/types.js';

/**
 * `git status --porcelain -z` 출력 파싱. NUL 구분이라 비ASCII/특수문자 경로가
 * 인용되지 않는다(Windows/POSIX 동일). 각 토큰은 `XY<space>PATH`; rename/copy
 * (X 가 R/C)는 다음 토큰이 원본 경로이므로 건너뛴다.
 */
export function parsePorcelainZ(stdout: string): PorcelainEntry[] {
  const tokens = stdout.split('\0');
  const entries: PorcelainEntry[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.length < 4) continue;
    const status = token.slice(0, 2);
    entries.push({ status: status.trim(), path: token.slice(3) });
    if (status.startsWith('R') || status.startsWith('C')) i += 1;
  }
  return entries;
}

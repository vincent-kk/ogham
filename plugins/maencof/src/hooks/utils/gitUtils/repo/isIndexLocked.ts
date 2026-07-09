/**
 * @file isIndexLocked.ts
 * @description .git/index.lock 존재 여부로 인덱스 잠금 상태를 판별한다.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function isIndexLocked(gitRoot: string): boolean {
  return existsSync(join(gitRoot, '.git', 'index.lock'));
}

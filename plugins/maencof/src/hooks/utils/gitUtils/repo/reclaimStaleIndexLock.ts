/**
 * @file reclaimStaleIndexLock.ts
 * @description 잔존 `.git/index.lock` 회수 판정. 프로세스가 SIGKILL 로 절단되면
 * lock 이 남아 커밋 게이트를 영구 차단할 수 있다 — mtime 이 임계를 넘은 lock 만
 * stale 로 판정해 삭제한다. 신선한 lock 은 살아있는 git 작업으로 존중한다.
 */
import { statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { INDEX_LOCK_STALE_MS } from '../../../../constants/vaultCommitter.js';

export type IndexLockReclaim = 'no-lock' | 'reclaimed' | 'live';

export function reclaimStaleIndexLock(gitRoot: string): IndexLockReclaim {
  const lockPath = join(gitRoot, '.git', 'index.lock');
  let mtimeMs: number;
  try {
    mtimeMs = statSync(lockPath).mtimeMs;
  } catch {
    return 'no-lock';
  }

  if (Date.now() - mtimeMs < INDEX_LOCK_STALE_MS) return 'live';

  try {
    unlinkSync(lockPath);
  } catch {
    // concurrent reclaim already removed it (ENOENT) — treat as reclaimed;
    // git recreates its own lock afterwards, serializing writers again
  }
  return 'reclaimed';
}

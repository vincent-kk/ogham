/**
 * @file background-rebuild.ts
 * @description Fire-and-forget background graph rebuild with module-level mutex.
 * Caller (read-path / mutate-side-effects) MUST never await the rebuild.
 */
import { appendErrorLogSafe } from '../../../core/error-log/index.js';
import { handleKgBuild } from '../../tools/kg-build/index.js';
import { invalidateCache } from '../graph-cache/index.js';

// 단일 vault 가정. multi-vault 도입 시 Map<vaultPath, Promise<void>>로 전환.
let rebuildInProgress: Promise<void> | null = null;

/**
 * background graph rebuild를 트리거한다.
 *
 * - 이미 진행 중이면 no-op (mutex)
 * - 성공 finalize 시 invalidateCache() → 다음 read는 disk reload
 * - 실패 시 appendErrorLogSafe로 흐림
 */
export function triggerBackgroundRebuild(vaultPath: string): void {
  if (rebuildInProgress) return;

  rebuildInProgress = (async () => {
    try {
      const result = await handleKgBuild(vaultPath, { force: false });
      if (result.success) invalidateCache();
    } catch (err) {
      appendErrorLogSafe(vaultPath, {
        hook: 'background-rebuild',
        error: String(err),
        timestamp: new Date().toISOString(),
      });
    }
  })().finally(() => {
    rebuildInProgress = null;
  });
}

/** @internal Test-only: returns the in-flight rebuild promise so tests can await it. */
export function _peekRebuildInProgress(): Promise<void> | null {
  return rebuildInProgress;
}

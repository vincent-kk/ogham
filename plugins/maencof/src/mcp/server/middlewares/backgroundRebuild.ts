/**
 * @file backgroundRebuild.ts
 * @description Fire-and-forget background graph rebuild with module-level mutex.
 * Caller (read-path / mutate-side-effects) MUST never await the rebuild.
 */
import { appendErrorLogSafe } from '../../../core/errorLog/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import { handleKgBuild } from '../../tools/kgBuild/index.js';
import { invalidateCache } from '../graphCache/index.js';

import { refreshTurnContextSafe } from './refreshTurnContext.js';

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
      if (result.success) {
        invalidateCache();
        refreshTurnContextSafe(vaultPath);
      }
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

/**
 * 서버 부팅 시 stale 엔트리가 1개 이상이면 background rebuild를 1회 트리거한다.
 *
 * vaultWalk(외부 변경 stale 마킹) 직후 체이닝하는 용도. SessionStart 훅은 동기·5초 제약·단명
 * 프로세스라 빌드를 버틸 수 없으므로, 장수 프로세스인 MCP 서버 부팅에서 처리한다. read-path 의
 * STALE_REBUILD_THRESHOLD(잦은 호출 억제용)와 달리 부팅은 세션당 1회뿐이라 stale > 0 에서
 * 트리거해 직전 세션의 미반영 변경(예: 핸드오프 문서)을 즉시 인덱싱한다. 정상 상태(변경 없음)에선
 * stale 0 이라 no-op. 절대 await 하지 않는다(부팅 흐름 비차단).
 */
export async function triggerBootRebuildIfStale(
  vaultPath: string,
): Promise<void> {
  try {
    const store = new MetadataStore(vaultPath);
    const stale = await store.loadStaleEntries();
    if (stale.entries.length > 0) triggerBackgroundRebuild(vaultPath);
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'boot-rebuild',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

/** @internal Test-only: returns the in-flight rebuild promise so tests can await it. */
export function _peekRebuildInProgress(): Promise<void> | null {
  return rebuildInProgress;
}

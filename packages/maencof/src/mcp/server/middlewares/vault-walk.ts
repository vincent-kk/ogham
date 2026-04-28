/**
 * @file vault-walk.ts
 * @description Detect external vault changes (mtime diff vs MetadataStore snapshot)
 * and append to stale-nodes. Caller MUST detach (fire-and-forget).
 */
import { appendErrorLogSafe } from '../../../core/error-log/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import { scanVault } from '../../../core/vault-scanner/index.js';

/**
 * 저장된 snapshot 과 vault 현재 상태를 비교해 mtime 변경분만 stale로 표시한다.
 *
 * - snapshot 부재 → no-op (첫 부팅에 모든 파일 stale 마킹 방지).
 * - 새 파일 / 삭제 파일은 본 walk에서 처리하지 않는다 — 다음 kg_build의 자연 흐름이 처리.
 * - 실패는 silent (server 부팅 흐름을 막지 않는다).
 */
export async function walkVaultForExternalChanges(
  vaultPath: string,
): Promise<void> {
  try {
    const store = new MetadataStore(vaultPath);
    const snapshot = await store.loadSnapshot();
    if (!snapshot) return;

    const snapshotByPath = new Map(
      snapshot.entries.map((entry) => [entry.path, entry] as const),
    );

    const currentFiles = await scanVault(vaultPath);

    const stalePaths: string[] = [];
    for (const file of currentFiles) {
      const saved = snapshotByPath.get(file.relativePath);
      if (!saved) continue;
      if (saved.mtime !== file.mtime) stalePaths.push(file.relativePath);
    }

    if (stalePaths.length > 0)
      await store.appendStaleEntries(
        stalePaths.map((path) => ({ path, op: 'mutate' as const })),
      );
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'vault-walk',
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}

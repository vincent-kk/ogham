/**
 * @file computeChangeSet.ts
 * @description 현재 파일 목록과 이전 스냅샷을 비교하여 변경 세트를 계산한다.
 */
import type { FileSnapshot, SnapshotEntry } from '../../metadataStore/index.js';
import type { ChangeSet, CurrentFileInfo } from '../types/types.js';

/**
 * 현재 파일 목록과 이전 스냅샷을 비교하여 변경 세트를 계산한다.
 *
 * @param currentFiles - 현재 파일 목록 (path, mtime, size)
 * @param snapshot - 이전 스냅샷 (null이면 전체 변경으로 처리)
 * @returns 변경 세트
 */
export function computeChangeSet(
  currentFiles: CurrentFileInfo[],
  snapshot: FileSnapshot | null,
): ChangeSet {
  if (!snapshot)
    // 스냅샷 없음 → 모든 파일이 새로 추가된 것으로 처리
    return {
      added: currentFiles.map((f) => f.path),
      modified: [],
      deleted: [],
      unchanged: 0,
    };

  const snapshotMap = new Map<string, SnapshotEntry>();
  for (const entry of snapshot.entries) snapshotMap.set(entry.path, entry);

  const currentMap = new Map<string, CurrentFileInfo>();
  for (const file of currentFiles) currentMap.set(file.path, file);

  const added: string[] = [];
  const modified: string[] = [];
  let unchanged = 0;

  // 추가 및 수정 탐지
  for (const [path, current] of currentMap) {
    const prev = snapshotMap.get(path);
    if (!prev) added.push(path);
    else if (current.mtime !== prev.mtime || current.size !== prev.size)
      modified.push(path);
    else unchanged++;
  }

  // 삭제 탐지
  const deleted: string[] = [];
  for (const [path] of snapshotMap)
    if (!currentMap.has(path)) deleted.push(path);

  return { added, modified, deleted, unchanged };
}

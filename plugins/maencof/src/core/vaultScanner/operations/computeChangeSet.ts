/**
 * @file computeChangeSet.ts
 * @description 이전 스냅샷과 현재 파일 목록을 비교하여 변경 세트를 계산한다.
 */
import type { ChangeSet, FileSnapshot, ScannedFile } from '../types/types.js';

/**
 * @param previous - 이전 스냅샷 (relativePath → mtime)
 * @param current - 현재 스캔된 파일 목록
 * @returns 추가/수정/삭제/변경없음 분류된 변경 세트
 */
export function computeChangeSet(
  previous: FileSnapshot,
  current: ScannedFile[],
): ChangeSet {
  const changeSet: ChangeSet = {
    added: [],
    modified: [],
    deleted: [],
    unchanged: [],
  };

  const currentPaths = new Set<string>();

  for (const file of current) {
    currentPaths.add(file.relativePath);
    const prevMtime = previous.get(file.relativePath);

    if (prevMtime === undefined) changeSet.added.push(file);
    else if (prevMtime !== file.mtime) changeSet.modified.push(file);
    else changeSet.unchanged.push(file);
  }

  // 삭제된 파일: 이전 스냅샷에 있지만 현재 없는 파일
  for (const relPath of previous.keys())
    if (!currentPaths.has(relPath)) changeSet.deleted.push(relPath);

  return changeSet;
}

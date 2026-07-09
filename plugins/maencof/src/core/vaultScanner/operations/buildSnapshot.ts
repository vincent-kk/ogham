/**
 * @file buildSnapshot.ts
 * @description 현재 스캔 결과로부터 파일 스냅샷을 생성한다.
 */
import type { FileSnapshot, ScannedFile } from '../types/types.js';

/**
 * @param files - 스캔된 파일 목록
 * @returns relativePath → mtime 맵
 */
export function buildSnapshot(files: ScannedFile[]): FileSnapshot {
  const snapshot: FileSnapshot = new Map();
  for (const file of files) snapshot.set(file.relativePath, file.mtime);

  return snapshot;
}

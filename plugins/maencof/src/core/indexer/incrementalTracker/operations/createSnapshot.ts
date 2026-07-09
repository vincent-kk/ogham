/**
 * @file createSnapshot.ts
 * @description 현재 파일 목록으로 새 스냅샷을 생성한다.
 */
import type { FileSnapshot } from '../../metadataStore/index.js';
import type { CurrentFileInfo } from '../types/types.js';

/**
 * 현재 파일 목록으로 새 스냅샷을 생성한다.
 */
export function createSnapshot(currentFiles: CurrentFileInfo[]): FileSnapshot {
  return {
    entries: currentFiles.map((f) => ({
      path: f.path,
      mtime: f.mtime,
      size: f.size,
    })),
    capturedAt: new Date().toISOString(),
  };
}

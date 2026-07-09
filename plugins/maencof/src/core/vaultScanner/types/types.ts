/**
 * @file types.ts
 * @description vaultScanner 공개 타입 — 스캔 파일 정보, 파일 스냅샷, 증분 변경 세트, 스캔 옵션.
 */

/** 스캔된 파일 정보 */
export interface ScannedFile {
  /** 파일 절대 경로 */
  absolutePath: string;
  /** vault 루트 기준 상대 경로 */
  relativePath: string;
  /** 파일 수정 시간 (Unix timestamp ms) */
  mtime: number;
}

/** 파일 스냅샷 (증분 스캔용) */
export type FileSnapshot = Map<string, number>; // relativePath → mtime

/** 증분 스캔 변경 세트 */
export interface ChangeSet {
  /** 새로 추가된 파일 */
  added: ScannedFile[];
  /** 수정된 파일 (mtime 변경) */
  modified: ScannedFile[];
  /** 삭제된 파일 (상대 경로만) */
  deleted: string[];
  /** 변경 없는 파일 */
  unchanged: ScannedFile[];
}

/** VaultScanner 옵션 */
export interface VaultScanOptions {
  /** 추가로 제외할 glob 패턴 */
  extraExclude?: string[];
  /** 심볼릭 링크 추적 여부 (기본: false) */
  followSymlinks?: boolean;
}

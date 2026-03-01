/**
 * @file vault-scanner.ts
 * @description Vault 디렉토리 스캐너 — fast-glob 기반 마크다운 파일 탐색, mtime 수집, 증분 변경 감지
 *
 * 설계 원칙:
 * - maencof core 모듈 중 유일하게 파일시스템 I/O를 직접 수행
 * - .maencof/, .maencof-meta/ 디렉토리 자동 제외
 * - 증분 스캔: 이전 스냅샷과 mtime 비교로 변경 파일만 추출
 */
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

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

/** 기본 제외 패턴 */
const DEFAULT_EXCLUDE = [
  '.maencof/**',
  '.maencof-meta/**',
  'node_modules/**',
  '.git/**',
];

/**
 * vault 디렉토리에서 모든 마크다운 파일을 스캔한다.
 *
 * @param vaultRoot - vault 루트 절대 경로
 * @param options - 스캔 옵션
 * @returns 스캔된 파일 목록 (mtime 포함)
 */
export async function scanVault(
  vaultRoot: string,
  options?: VaultScanOptions,
): Promise<ScannedFile[]> {
  const { glob } = await import('fast-glob');

  const exclude = [...DEFAULT_EXCLUDE, ...(options?.extraExclude ?? [])];

  const filePaths: string[] = await glob('**/*.md', {
    cwd: vaultRoot,
    ignore: exclude,
    followSymbolicLinks: options?.followSymlinks ?? false,
    onlyFiles: true,
    dot: false,
  });

  const results: ScannedFile[] = await Promise.all(
    filePaths.map(async (relPath) => {
      const absolutePath = join(vaultRoot, relPath);
      const stats = await stat(absolutePath);
      return {
        absolutePath,
        relativePath: relPath,
        mtime: stats.mtimeMs,
      };
    }),
  );

  return results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * 현재 스캔 결과로부터 파일 스냅샷을 생성한다.
 *
 * @param files - 스캔된 파일 목록
 * @returns relativePath → mtime 맵
 */
export function buildSnapshot(files: ScannedFile[]): FileSnapshot {
  const snapshot: FileSnapshot = new Map();
  for (const file of files) {
    snapshot.set(file.relativePath, file.mtime);
  }
  return snapshot;
}

/**
 * 이전 스냅샷과 현재 파일 목록을 비교하여 변경 세트를 계산한다.
 *
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

    if (prevMtime === undefined) {
      changeSet.added.push(file);
    } else if (prevMtime !== file.mtime) {
      changeSet.modified.push(file);
    } else {
      changeSet.unchanged.push(file);
    }
  }

  // 삭제된 파일: 이전 스냅샷에 있지만 현재 없는 파일
  for (const relPath of previous.keys()) {
    if (!currentPaths.has(relPath)) {
      changeSet.deleted.push(relPath);
    }
  }

  return changeSet;
}

/**
 * 증분 스캔: 이전 스냅샷과 비교하여 변경된 파일만 추출한다.
 *
 * @param vaultRoot - vault 루트 절대 경로
 * @param previousSnapshot - 이전 스냅샷 (없으면 전체 스캔처럼 동작)
 * @param options - 스캔 옵션
 * @returns 변경 세트
 */
export async function scanIncrementalChanges(
  vaultRoot: string,
  previousSnapshot: FileSnapshot,
  options?: VaultScanOptions,
): Promise<ChangeSet> {
  const current = await scanVault(vaultRoot, options);
  return computeChangeSet(previousSnapshot, current);
}

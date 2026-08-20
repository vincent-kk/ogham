/**
 * @file scanByPatterns.ts
 * @description glob 패턴 → ScannedFile[] 공통 조립 — scanVault/scanArchive 가 패턴만 주입한다.
 */
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { VAULT_SCAN_DEFAULT_EXCLUDE as DEFAULT_EXCLUDE } from '../../../constants/vaultScanner.js';
import type { ScannedFile, VaultScanOptions } from '../types/types.js';

/**
 * 주어진 allowlist 패턴으로 vault 를 스캔한다.
 *
 * @param vaultRoot - vault 루트 절대 경로
 * @param patterns - fast-glob allowlist 패턴
 * @param options - 스캔 옵션 (extraExclude 는 기본 제외에 더해지기만 한다)
 * @returns relativePath 사전순으로 정렬된 스캔 결과 (mtime ms 포함)
 */
export async function scanByPatterns(
  vaultRoot: string,
  patterns: readonly string[],
  options?: VaultScanOptions,
): Promise<ScannedFile[]> {
  const { glob } = await import('fast-glob');

  const exclude = [...DEFAULT_EXCLUDE, ...(options?.extraExclude ?? [])];

  const filePaths: string[] = await glob([...patterns], {
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

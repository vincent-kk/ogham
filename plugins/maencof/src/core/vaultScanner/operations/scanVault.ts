/**
 * @file scanVault.ts
 * @description vault 디렉토리에서 모든 마크다운 파일을 스캔한다.
 */
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import { VAULT_SCAN_DEFAULT_EXCLUDE as DEFAULT_EXCLUDE } from '../../../constants/vaultScanner.js';
import type { ScannedFile, VaultScanOptions } from '../types/types.js';

/**
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

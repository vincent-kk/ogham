/**
 * @file scanVault.ts
 * @description vault 디렉토리에서 모든 마크다운 파일을 스캔한다.
 */
import { VAULT_SCAN_LAYER_PATTERNS } from '../../../constants/vaultScanner.js';
import type { ScannedFile, VaultScanOptions } from '../types/types.js';

import { scanByPatterns } from './scanByPatterns.js';

/**
 * @param vaultRoot - vault 루트 절대 경로
 * @param options - 스캔 옵션
 * @returns 스캔된 파일 목록 (mtime 포함)
 */
export async function scanVault(
  vaultRoot: string,
  options?: VaultScanOptions,
): Promise<ScannedFile[]> {
  return scanByPatterns(vaultRoot, VAULT_SCAN_LAYER_PATTERNS, options);
}

/**
 * @file scanArchive.ts
 * @description 서고(99_Archive) 마크다운 스캔 — 그래프 인덱싱 스캔(scanVault)과 분리된
 * 아카이브 열거 전용 진입점. 결과는 그래프 노드가 되지 않는다.
 */
import { ARCHIVE_SCAN_PATTERNS } from '../../../constants/vaultScanner.js';
import type { ScannedFile, VaultScanOptions } from '../types/types.js';

import { scanByPatterns } from './scanByPatterns.js';

/**
 * 서고 하위 md 를 스캔한다.
 *
 * @param vaultRoot - vault 루트 절대 경로
 * @param options - 스캔 옵션
 * @returns relativePath 사전순 정렬 스캔 결과
 */
export async function scanArchive(
  vaultRoot: string,
  options?: VaultScanOptions,
): Promise<ScannedFile[]> {
  return scanByPatterns(vaultRoot, ARCHIVE_SCAN_PATTERNS, options);
}

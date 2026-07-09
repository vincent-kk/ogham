/**
 * @file scanIncrementalChanges.ts
 * @description 증분 스캔: 이전 스냅샷과 비교하여 변경된 파일만 추출한다.
 */
import type {
  ChangeSet,
  FileSnapshot,
  VaultScanOptions,
} from '../types/types.js';

import { computeChangeSet } from './computeChangeSet.js';
import { scanVault } from './scanVault.js';

/**
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

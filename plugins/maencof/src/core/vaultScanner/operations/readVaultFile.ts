/**
 * @file readVaultFile.ts
 * @description vault 내 파일의 내용을 읽어 반환한다.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * @param vaultRoot - vault 루트 절대 경로
 * @param relativePath - vault 루트 기준 상대 경로
 * @returns 파일 내용 (UTF-8)
 */
export async function readVaultFile(
  vaultRoot: string,
  relativePath: string,
): Promise<string> {
  const absolutePath = join(vaultRoot, relativePath);
  return readFile(absolutePath, 'utf-8');
}

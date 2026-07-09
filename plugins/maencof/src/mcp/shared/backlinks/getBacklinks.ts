/**
 * @file getBacklinks.ts
 * @description backlink-index.json에서 특정 대상의 backlink를 조회한다.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function getBacklinks(
  vaultPath: string,
  targetPath: string,
): Promise<string[]> {
  const metaDir = join(vaultPath, '.maencof-meta');
  const indexPath = join(metaDir, 'backlink-index.json');

  try {
    const raw = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(raw) as Record<string, string[]>;
    return index[targetPath] ?? [];
  } catch {
    return [];
  }
}

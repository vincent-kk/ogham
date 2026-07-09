/**
 * @file removeBacklinks.ts
 * @description backlink-index.json에서 특정 소스의 링크를 제거한다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function removeBacklinks(
  vaultPath: string,
  sourcePath: string,
): Promise<void> {
  const metaDir = join(vaultPath, '.maencof-meta');
  const indexPath = join(metaDir, 'backlink-index.json');

  let index: Record<string, string[]>;
  try {
    const raw = await readFile(indexPath, 'utf-8');
    index = JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return;
  }

  // 소스 경로가 출처인 항목 제거
  let changed = false;
  for (const target of Object.keys(index)) {
    const before = index[target].length;
    index[target] = index[target].filter((src) => src !== sourcePath);
    if (index[target].length !== before) changed = true;
    // 빈 배열 제거
    if (index[target].length === 0) delete index[target];
  }

  if (changed) await writeFile(indexPath, JSON.stringify(index), 'utf-8');
}

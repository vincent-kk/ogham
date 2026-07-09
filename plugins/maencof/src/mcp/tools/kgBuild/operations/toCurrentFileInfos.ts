/**
 * @file toCurrentFileInfos.ts
 * @description ScannedFile[] → CurrentFileInfo[] 어댑터. stat()으로 size 필드를 보충한다.
 */
import { stat } from 'node:fs/promises';

import type { CurrentFileInfo } from '../../../../core/indexer/incrementalTracker/index.js';
import type { ScannedFile } from '../../../../core/vaultScanner/index.js';

export async function toCurrentFileInfos(
  files: ScannedFile[],
): Promise<CurrentFileInfo[]> {
  return Promise.all(
    files.map(async (f) => {
      const s = await stat(f.absolutePath);
      return { path: f.relativePath, mtime: f.mtime, size: s.size };
    }),
  );
}

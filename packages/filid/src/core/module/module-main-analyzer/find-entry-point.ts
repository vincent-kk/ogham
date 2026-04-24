import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { ENTRY_CANDIDATES } from '../../../constants/entry-candidates.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 모듈 디렉토리에서 진입점 파일을 탐색한다.
 *
 * 탐색 순서:
 * 1. index.ts
 * 2. index.js
 * 3. main.ts
 * 4. main.js
 * 5. 디렉토리 내 유일한 .ts 파일 (여러 개이면 null)
 *
 * @param modulePath - 탐색할 디렉토리의 절대 경로
 * @returns 진입점 파일의 절대 경로 또는 null
 */
export async function findEntryPoint(
  modulePath: string,
): Promise<string | null> {
  // 1. 후보 파일을 순서대로 확인
  for (const candidate of ENTRY_CANDIDATES) {
    const full = join(modulePath, candidate);
    if (await fileExists(full)) return full;
  }

  // 2. 디렉토리 내 .ts 파일이 하나뿐이면 그것이 진입점
  try {
    const entries = await readdir(modulePath, { withFileTypes: true });
    const tsFiles = entries
      .filter(
        (e) =>
          e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts'),
      )
      .map((e) => e.name);
    if (tsFiles.length === 1) {
      return join(modulePath, tsFiles[0]);
    }
  } catch {
    // 디렉토리 읽기 실패
  }

  return null;
}

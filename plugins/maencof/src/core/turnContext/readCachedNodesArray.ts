import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_FILES } from '../../constants/cacheFiles.js';
import { parseGenerationShard } from '../utils/parseGenerationShard.js';
import { parseGraphGeneration } from '../utils/parseGraphGeneration.js';

/**
 * 훅의 짧은 동기 읽기를 위해 마커가 지정한 세대의 노드만 읽는다.
 * @param cwd vault 루트. 구포맷과 미공개 세대는 읽지 않는다.
 * @returns 일치하는 세대의 노드 배열. 부재·손상·불일치는 빈 배열이다.
 */
export function readCachedNodesArray<T = unknown>(cwd: string): T[] {
  const cacheDir = join(cwd, '.maencof');
  try {
    const meta = parseGraphGeneration(
      readFileSync(join(cacheDir, CACHE_FILES.GRAPH_META), 'utf-8'),
    );
    if (!meta) return [];
    return parseGenerationShard<T>(
      readFileSync(
        join(
          cacheDir,
          CACHE_FILES.GENERATIONS,
          meta.generation,
          CACHE_FILES.NODES,
        ),
        'utf-8',
      ),
      meta.generation,
    );
  } catch {
    return [];
  }
}

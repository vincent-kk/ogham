import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_FILES } from '@ogham/maencof';

export interface MarkerInfo {
  kind: 'graph-meta' | 'legacy';
  path: string;
  mtimeMs: number;
}

const MAENCOF_DIR = '.maencof';

function safeStatMtime(path: string): number | null {
  try {
    if (!existsSync(path)) return null;
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * 볼트 인덱스 마커를 탐색한다. graph-meta(v2 commit marker)를 우선 채택하고,
 * 없으면 legacy index.json을 반환한다. 둘 다 부재 시 null.
 * stat 실패는 부재로 간주해 다음 후보로 넘어간다 (예외 미전파).
 */
export function findIndexMarker(vaultPath: string): MarkerInfo | null {
  const graphMetaPath = join(vaultPath, MAENCOF_DIR, CACHE_FILES.GRAPH_META);
  const graphMetaMtime = safeStatMtime(graphMetaPath);
  if (graphMetaMtime !== null) {
    return { kind: 'graph-meta', path: graphMetaPath, mtimeMs: graphMetaMtime };
  }

  const legacyPath = join(vaultPath, MAENCOF_DIR, CACHE_FILES.INDEX);
  const legacyMtime = safeStatMtime(legacyPath);
  if (legacyMtime !== null) {
    return { kind: 'legacy', path: legacyPath, mtimeMs: legacyMtime };
  }

  return null;
}

/**
 * @file read-cached-nodes-array.ts
 * @description Sync-read the cached node array from the 3-shard layout (nodes.json) with legacy fallback (index.json::nodes).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CACHE_FILES } from '../../../constants/cache-files.js';

/**
 * .maencof/ 캐시에서 노드 배열을 동기 read 한다.
 *
 * 우선순위:
 * 1. 신규 샤드 `nodes.json` — `KnowledgeNode[]` 직렬화. 배열이면 그대로 반환.
 * 2. 레거시 `index.json` — `{ nodes: KnowledgeNode[] | Record<NodeId, KnowledgeNode> }`. 배열/객체 모두 정규화.
 * 3. 둘 다 부재/parse 오류 → 빈 배열 (silent fallback).
 *
 * 훅 호출 컨텍스트(prompt-submit pre-call)는 짧은 동기 I/O 가 허용되므로 fs sync API 를 사용한다.
 * 이는 `MetadataStore` async 경로와는 별개의 hook fast-read 경로이다.
 */
export function readCachedNodesArray<T = unknown>(cwd: string): T[] {
  const cacheDir = join(cwd, '.maencof');
  const nodesPath = join(cacheDir, CACHE_FILES.NODES);
  const metaPath = join(cacheDir, CACHE_FILES.GRAPH_META);
  const legacyPath = join(cacheDir, CACHE_FILES.INDEX);
  try {
    if (existsSync(nodesPath) && existsSync(metaPath)) {
      const parsed = JSON.parse(readFileSync(nodesPath, 'utf-8')) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    }
    if (existsSync(legacyPath)) {
      const parsed = JSON.parse(readFileSync(legacyPath, 'utf-8')) as {
        nodes?: unknown;
      };
      if (Array.isArray(parsed.nodes)) {
        return parsed.nodes as T[];
      }
      if (parsed.nodes && typeof parsed.nodes === 'object') {
        return Object.values(parsed.nodes) as T[];
      }
    }
    return [];
  } catch {
    return [];
  }
}

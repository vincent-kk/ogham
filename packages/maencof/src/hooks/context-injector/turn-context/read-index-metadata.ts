/**
 * @file read-index-metadata.ts
 * @description Read .maencof/{nodes.json|index.json} metadata for turn-context assembly.
 */
import { readCachedNodesArray } from './read-cached-nodes-array.js';

export interface IndexMetadata {
  totalNodes: number;
  layerCounts: Record<number, number>;
}

/**
 * 캐시된 노드 배열을 읽어 노드 개수와 레이어 분포를 반환한다.
 * 부재/오류 시 0 fallback.
 */
export function readIndexMetadata(cwd: string): IndexMetadata {
  const nodes = readCachedNodesArray<{ layer?: number }>(cwd);
  const result: IndexMetadata = { totalNodes: nodes.length, layerCounts: {} };
  for (const node of nodes) {
    const layer = typeof node.layer === 'number' ? node.layer : 0;
    result.layerCounts[layer] = (result.layerCounts[layer] ?? 0) + 1;
  }
  return result;
}

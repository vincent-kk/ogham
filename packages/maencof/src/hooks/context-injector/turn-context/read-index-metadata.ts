/**
 * @file read-index-metadata.ts
 * @description Read .maencof/index.json metadata for turn-context assembly.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface IndexMetadata {
  totalNodes: number;
  layerCounts: Record<number, number>;
}

/**
 * index.json을 읽고 노드 개수와 레이어 분포를 반환한다. 실패 시 0 fallback.
 */
export function readIndexMetadata(cwd: string): IndexMetadata {
  const indexPath = join(cwd, '.maencof', 'index.json');
  const result: IndexMetadata = { totalNodes: 0, layerCounts: {} };
  try {
    if (!existsSync(indexPath)) return result;
    const raw = readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as { nodes?: unknown };

    let nodes: Array<{ layer?: number }> = [];
    if (Array.isArray(parsed.nodes)) {
      nodes = parsed.nodes as Array<{ layer?: number }>;
    } else if (parsed.nodes && typeof parsed.nodes === 'object') {
      nodes = Object.values(parsed.nodes) as Array<{ layer?: number }>;
    }

    result.totalNodes = nodes.length;
    for (const node of nodes) {
      const layer = typeof node.layer === 'number' ? node.layer : 0;
      result.layerCounts[layer] = (result.layerCounts[layer] ?? 0) + 1;
    }
  } catch {
    // silent fallback
  }
  return result;
}

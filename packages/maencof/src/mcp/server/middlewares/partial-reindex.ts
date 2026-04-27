/**
 * @file partial-reindex.ts
 * @description Hybrid partial reindex — node 교체 + outbound edge 재계산.
 * weights / pageRank / edgeWeightMap / edgeTypeMap / adjacencyList는 background rebuild 의존.
 */
import { readFile, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/document-parser/index.js';
import { appendErrorLogSafe } from '../../../core/error-log/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeEdge, KnowledgeGraph } from '../../../types/graph.js';

/**
 * Stale path 들을 파싱해 graph nodes Map과 outbound edges에 반영한다 (Hybrid).
 *
 * - node 교체 (같은 id, 새 데이터). NodeId == path (toNodeId 가 identity) 이므로 동일 path 재빌드는 graph.nodes 의 기존 엔트리를 자연 덮어쓴다.
 * - outbound edges: source가 stale인 기존 엣지 제거 → freshNode.outboundLinks 중 graph에 존재하는 target만 신규 LINK 엣지로 추가
 * - weights / pageRank / edgeWeightMap / edgeTypeMap / adjacencyList는 갱신하지 않는다
 * - 디스크 미반영. 호출자는 동일 graph reference를 즉시 사용 가능.
 */
export async function mergeStaleNodesIntoGraph(
  vaultPath: string,
  graph: KnowledgeGraph,
): Promise<KnowledgeGraph> {
  const store = new MetadataStore(vaultPath);
  const stale = await store.loadStaleNodes();
  if (stale.paths.length === 0) return graph;

  const pathToNodeId = new Map<string, NodeId>();
  for (const node of graph.nodes.values()) {
    pathToNodeId.set(node.path, node.id);
  }

  const replacedSourceIds = new Set<NodeId>();

  for (const stalePath of stale.paths) {
    try {
      const absolutePath = join(vaultPath, stalePath);
      const content = await readFile(absolutePath, 'utf-8');
      const stats = await stat(absolutePath);
      const doc = parseDocument(stalePath, content, stats.mtimeMs);
      const built = buildKnowledgeNode(doc);
      if (!built.success || !built.node) continue;

      const freshNode = built.node;
      freshNode.outboundLinks = doc.links
        .filter((link) => !link.isAbsolute)
        .map((link) => {
          const sourceDir = posix.dirname(stalePath);
          const isRel =
            link.href.startsWith('./') || link.href.startsWith('../');
          return isRel
            ? posix.normalize(posix.join(sourceDir, link.href))
            : link.href;
        });

      graph.nodes.set(freshNode.id, freshNode);
      pathToNodeId.set(freshNode.path, freshNode.id);
      replacedSourceIds.add(freshNode.id);
    } catch (err) {
      appendErrorLogSafe(vaultPath, {
        hook: 'partial-reindex',
        error: `${stalePath}: ${String(err)}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (replacedSourceIds.size === 0) return graph;

  graph.edges = graph.edges.filter((edge) => !replacedSourceIds.has(edge.from));

  for (const sourceId of replacedSourceIds) {
    const node = graph.nodes.get(sourceId);
    if (!node?.outboundLinks) continue;
    for (const targetPath of node.outboundLinks) {
      const targetId = pathToNodeId.get(targetPath);
      if (!targetId) continue;
      const newEdge: KnowledgeEdge = {
        from: sourceId,
        to: targetId,
        type: 'LINK',
        weight: 1,
      };
      graph.edges.push(newEdge);
    }
  }

  graph.edgeCount = graph.edges.length;

  return graph;
}

/**
 * @file partialReindex.ts
 * @description Hybrid partial reindex — node 교체/삭제 + outbound edge 재계산 + invertedIndex 동기 갱신.
 * weights / pageRank / edgeWeightMap / edgeTypeMap / adjacencyList 는 background rebuild 의존.
 */
import { readFile, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../core/documentParser/index.js';
import { appendErrorLogSafe } from '../../../core/errorLog/index.js';
import {
  addNodeToInvertedIndex,
  removeNodeFromInvertedIndex,
} from '../../../core/graphBuilder/index.js';
import { MetadataStore } from '../../../core/indexer/index.js';
import type { StaleEntry } from '../../../core/indexer/metadataStore/metadataStore.js';
import { invalidateQueryCache } from '../../../search/queryEngine/index.js';
import type { NodeId } from '../../../types/common.js';
import { toNodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';

/**
 * Stale entries 를 파싱해 graph nodes Map / outbound edges / invertedIndex 에 반영한다 (Hybrid).
 *
 * - `op === 'mutate'`: node 교체. NodeId == path (toNodeId 가 identity) 이므로 동일 path 재빌드는 graph.nodes 의 기존 엔트리를 자연 덮어쓴다. 사전에 캐시된 oldNode 의 invertedIndex term 을 제거한 뒤 freshNode term 을 추가한다. ENOENT 등 readFile 실패는 로그 + skip — race/외부 삭제와 구분 불가하므로 노드 삭제로 해석하지 않는다.
 * - `op === 'delete'`: graph.nodes 에서 노드 제거 + 해당 노드를 source/target 으로 하는 모든 edges 제거 + invertedIndex 의 term 에서 제거.
 * - weights / pageRank / edgeWeightMap / edgeTypeMap / adjacencyList 는 갱신하지 않는다.
 * - 디스크 미반영. 호출자는 동일 graph reference 를 즉시 사용 가능.
 *
 * @sideEffect 변경이 적용되면 (replacedSourceIds.size + anyDeleted > 0) module-level queryCache 를 invalidate. 이는 graph.builtAt 미변경 in-place mutation 의 결과로 동일 builtAt 키에 묶인 SA 캐시 결과가 stale 하게 반환되는 read-path 비일관을 차단한다.
 * @see invalidateQueryCache
 */
export async function mergeStaleNodesIntoGraph(
  vaultPath: string,
  graph: KnowledgeGraph,
  entries?: StaleEntry[],
): Promise<KnowledgeGraph> {
  let toProcess: StaleEntry[];
  if (entries) toProcess = entries;
  else {
    const store = new MetadataStore(vaultPath);
    const stale = await store.loadStaleEntries();
    toProcess = stale.entries;
  }
  if (toProcess.length === 0) return graph;

  const pathToNodeId = new Map<string, NodeId>();
  for (const node of graph.nodes.values()) pathToNodeId.set(node.path, node.id);

  const replacedSourceIds = new Set<NodeId>();
  let anyDeleted = false;

  for (const entry of toProcess) {
    if (entry.op === 'delete') {
      if (handleDelete(graph, pathToNodeId, entry.path)) anyDeleted = true;
      continue;
    }
    await handleMutate(
      vaultPath,
      graph,
      pathToNodeId,
      replacedSourceIds,
      entry.path,
    );
  }

  if (replacedSourceIds.size === 0 && !anyDeleted) return graph;

  // mutate(replace) source 의 기존 outbound edges 를 제거하고 fresh outbound 로 갈아낀다.
  // delete source 의 모든 incident edges 는 handleDelete 에서 이미 제거됨.
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

  // Graph structure changed in place but graph.builtAt was NOT bumped.
  // Module-level queryCache keys on builtAt; without explicit invalidation
  // the next call with identical seeds/options would hit a pre-merge
  // result. Invalidate exactly when at least one delta was applied.
  invalidateQueryCache();

  return graph;
}

function handleDelete(
  graph: KnowledgeGraph,
  pathToNodeId: Map<string, NodeId>,
  stalePath: string,
): boolean {
  const targetId = pathToNodeId.get(stalePath) ?? toNodeId(stalePath);
  const oldNode = graph.nodes.get(targetId);
  if (!oldNode) return false;

  graph.nodes.delete(targetId);
  pathToNodeId.delete(stalePath);
  graph.edges = graph.edges.filter(
    (edge) => edge.from !== targetId && edge.to !== targetId,
  );
  removeNodeFromInvertedIndex(graph.invertedIndex, oldNode);
  return true;
}

async function handleMutate(
  vaultPath: string,
  graph: KnowledgeGraph,
  pathToNodeId: Map<string, NodeId>,
  replacedSourceIds: Set<NodeId>,
  stalePath: string,
): Promise<void> {
  let freshNode: KnowledgeNode | undefined;
  let oldNode: KnowledgeNode | undefined;
  try {
    const absolutePath = join(vaultPath, stalePath);
    const content = await readFile(absolutePath, 'utf-8');
    const stats = await stat(absolutePath);
    const doc = parseDocument(stalePath, content, stats.mtimeMs);
    const built = buildKnowledgeNode(doc);
    if (!built.success || !built.node) return;

    freshNode = built.node;
    freshNode.outboundLinks = doc.links
      .filter((link) => !link.isAbsolute)
      .map((link) => {
        const sourceDir = posix.dirname(stalePath);
        const isRel = link.href.startsWith('./') || link.href.startsWith('../');
        return isRel
          ? posix.normalize(posix.join(sourceDir, link.href))
          : link.href;
      });

    const existingId = pathToNodeId.get(stalePath) ?? freshNode.id;
    oldNode = graph.nodes.get(existingId);
  } catch (err) {
    appendErrorLogSafe(vaultPath, {
      hook: 'partial-reindex',
      error: `${stalePath}: ${String(err)}`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!freshNode) return;

  if (oldNode) removeNodeFromInvertedIndex(graph.invertedIndex, oldNode);

  graph.nodes.set(freshNode.id, freshNode);
  pathToNodeId.set(freshNode.path, freshNode.id);
  addNodeToInvertedIndex(graph.invertedIndex, freshNode);
  replacedSourceIds.add(freshNode.id);
}

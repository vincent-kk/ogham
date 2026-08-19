/**
 * @file buildLiveGraph.ts
 * @description 실볼트 읽기 전용 그래프 재구성 — liveVault 리포트와 archivedSweep
 * 실볼트 graded 모드가 공유한다.
 */
import { readFile } from 'node:fs/promises';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/documentParser/index.js';
import {
  buildGraph,
  hydrateRuntimeMaps,
} from '../../core/graphBuilder/index.js';
import { scanVault } from '../../core/vaultScanner/index.js';
import { calculateWeights } from '../../core/weightCalculator/index.js';
import { resolveAndAttachLinks } from '../../mcp/tools/kgBuild/index.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';

/**
 * kg_build fullBuild 와 동일 파이프라인의 읽기 전용 재구성 (저장 단계 없음).
 *
 * @param vaultPath - 스캔할 vault 루트 절대 경로
 * @returns 구축된 그래프와 파싱 실패 문서 수
 */
export async function buildLiveGraph(vaultPath: string): Promise<{
  graph: KnowledgeGraph;
  parseFailureCount: number;
}> {
  const files = await scanVault(vaultPath);
  const nodes = new Map<NodeId, KnowledgeNode>();
  const allLinks: Array<{ from: string; to: string }> = [];
  let parseFailureCount = 0;

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc);
        if (nodeResult.success && nodeResult.node) {
          nodes.set(nodeResult.node.id, nodeResult.node);
          for (const link of doc.links)
            if (!link.isAbsolute)
              allLinks.push({ from: file.relativePath, to: link.href });
        } else parseFailureCount++;
      } catch {
        parseFailureCount++;
      }
    }),
  );

  resolveAndAttachLinks(nodes, allLinks);
  const { graph } = buildGraph(Array.from(nodes.values()));
  const { edges: weightedEdges, pageranks } = calculateWeights(graph);
  graph.edges = weightedEdges;
  graph.edgeCount = weightedEdges.length;
  for (const [nodeId, rank] of pageranks) {
    const node = graph.nodes.get(nodeId);
    if (node) node.pagerank = rank;
  }
  hydrateRuntimeMaps(graph);
  return { graph, parseFailureCount };
}

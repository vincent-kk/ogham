/**
 * @file fullBuild.ts
 * @description 전체 vault를 스캔하고 그래프를 빌드한다.
 */
import { readFile } from 'node:fs/promises';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../../../core/documentParser/index.js';
import {
  buildGraph,
  hydrateRuntimeMaps,
} from '../../../../core/graphBuilder/index.js';
import { scanVault } from '../../../../core/vaultScanner/index.js';
import { calculateWeights } from '../../../../core/weightCalculator/index.js';
import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../../types/graph.js';
import type { BuildOutput, KgBuildParseFailure } from '../types/types.js';

import { resolveAndAttachLinks } from './resolveAndAttachLinks.js';

export async function fullBuild(vaultPath: string): Promise<BuildOutput> {
  const files = await scanVault(vaultPath);

  const nodes = new Map<NodeId, KnowledgeNode>();
  const allLinks: Array<{ from: string; to: string }> = [];
  const parseFailures: KgBuildParseFailure[] = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc);

        if (nodeResult.success && nodeResult.node) {
          nodes.set(nodeResult.node.id, nodeResult.node);

          // 아웃바운드 링크 수집
          for (const link of doc.links)
            if (!link.isAbsolute)
              allLinks.push({ from: file.relativePath, to: link.href });
        } else
          // frontmatter 검증 실패 — non-fatal surface
          parseFailures.push({
            path: file.relativePath,
            errors: doc.frontmatter.errors ?? [
              nodeResult.error ?? 'Unknown parse failure',
            ],
          });
      } catch (error) {
        // 파일 읽기/파서 예외 — non-fatal surface
        parseFailures.push({
          path: file.relativePath,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }),
  );

  // 아웃바운드 링크를 노드에 부착 (buildGraph에서 LINK 엣지 생성에 사용)
  resolveAndAttachLinks(nodes, allLinks);

  // 그래프 빌드
  const nodeList = Array.from(nodes.values());
  const graphResult = buildGraph(nodeList);

  // 가중치 계산
  const { edges: weightedEdges, pageranks } = calculateWeights(
    graphResult.graph,
  );

  // PageRank를 노드에 반영
  for (const [nodeId, rank] of pageranks) {
    const node = nodes.get(nodeId);
    if (node) node.pagerank = rank;
  }

  const builtAt = new Date().toISOString();
  const graph: KnowledgeGraph = {
    nodes,
    edges: weightedEdges,
    builtAt,
    nodeCount: nodes.size,
    edgeCount: weightedEdges.length,
  };
  // 런타임 맵은 loadGraph 와 동일 로직으로 부착 (build==load 보장).
  hydrateRuntimeMaps(graph);

  return { graph, files, parseFailures };
}

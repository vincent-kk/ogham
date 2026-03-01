/**
 * @file kg-build.ts
 * @description kg_build 도구 핸들러 — 인덱스 전체/증분 빌드 트리거
 */
import { stat } from 'node:fs/promises';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { buildGraph } from '../../core/graph-builder.js';
import { scanVault } from '../../core/vault-scanner.js';
import { calculateWeights } from '../../core/weight-calculator.js';
import { MetadataStore } from '../../index/metadata-store.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph } from '../../types/graph.js';
import type { KnowledgeNode } from '../../types/graph.js';
import type { MaencofCrudResult } from '../../types/mcp.js';

/** kg_build 입력 */
export interface KgBuildInput {
  /** 전체 재빌드 여부 (기본: false → 증분) */
  force?: boolean;
}

/** kg_build 응답 */
export interface KgBuildResult extends MaencofCrudResult {
  /** 빌드된 노드 수 */
  nodeCount: number;
  /** 빌드된 엣지 수 */
  edgeCount: number;
  /** 빌드 소요 시간 (ms) */
  durationMs: number;
  /** 증분 여부 */
  incremental: boolean;
}

/**
 * 전체 vault를 스캔하고 그래프를 빌드하여 저장한다.
 */
async function fullBuild(vaultPath: string): Promise<KnowledgeGraph> {
  const files = await scanVault(vaultPath);

  const nodes = new Map<NodeId, KnowledgeNode>();
  const allLinks: Array<{ from: string; to: string }> = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await import('node:fs/promises').then((m) =>
          m.readFile(file.absolutePath, 'utf-8'),
        );
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc);

        if (nodeResult.success && nodeResult.node) {
          nodes.set(nodeResult.node.id, nodeResult.node);

          // 아웃바운드 링크 수집
          for (const link of doc.links) {
            if (!link.isAbsolute) {
              allLinks.push({ from: file.relativePath, to: link.href });
            }
          }
        }
      } catch {
        // 개별 파일 파싱 실패는 무시
      }
    }),
  );

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
    if (node) {
      node.pagerank = rank;
    }
  }

  const builtAt = new Date().toISOString();
  const finalGraph: KnowledgeGraph = {
    nodes,
    edges: weightedEdges,
    builtAt,
    nodeCount: nodes.size,
    edgeCount: weightedEdges.length,
  };

  return finalGraph;
}

/**
 * kg_build 핸들러
 */
export async function handleKgBuild(
  vaultPath: string,
  _input: KgBuildInput,
): Promise<KgBuildResult> {
  const startTime = Date.now();
  const store = new MetadataStore(vaultPath);

  try {
    // 전체 빌드 (P0에서는 항상 전체 빌드, 증분은 Phase 1+)
    const graph = await fullBuild(vaultPath);

    // 그래프 저장
    await store.saveGraph(graph);
    await store.clearStaleNodes();

    // 스냅샷 저장
    const files = await scanVault(vaultPath);
    const snapshotEntries = await Promise.all(
      files.map(async (f) => {
        const s = await stat(f.absolutePath);
        return { path: f.relativePath, mtime: f.mtime, size: s.size };
      }),
    );
    await store.saveSnapshot({
      entries: snapshotEntries,
      capturedAt: new Date().toISOString(),
    });

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      path: vaultPath,
      message: `Index build complete: ${graph.nodeCount} nodes, ${graph.edgeCount} edges (${durationMs}ms)`,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      durationMs,
      incremental: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      path: vaultPath,
      message: `Index build failed: ${message}`,
      nodeCount: 0,
      edgeCount: 0,
      durationMs: Date.now() - startTime,
      incremental: false,
    };
  }
}

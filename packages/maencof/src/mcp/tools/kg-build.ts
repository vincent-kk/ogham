/**
 * @file kg-build.ts
 * @description kg_build 도구 핸들러 — 인덱스 전체/증분 빌드 트리거
 */
import { readFile, stat } from 'node:fs/promises';

import {
  buildKnowledgeNode,
  parseDocument,
} from '../../core/document-parser.js';
import { buildGraph } from '../../core/graph-builder.js';
import type { ScannedFile } from '../../core/vault-scanner.js';
import { scanVault } from '../../core/vault-scanner.js';
import { calculateWeights } from '../../core/weight-calculator.js';
import {
  type CurrentFileInfo,
  computeChangeSet,
  computeIncrementalScope,
  createSnapshot,
} from '../../index/incremental-tracker.js';
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
 * ScannedFile[] → CurrentFileInfo[] 어댑터.
 * stat()으로 size 필드를 보충한다.
 */
async function toCurrentFileInfos(
  files: ScannedFile[],
): Promise<CurrentFileInfo[]> {
  return Promise.all(
    files.map(async (f) => {
      const s = await stat(f.absolutePath);
      return { path: f.relativePath, mtime: f.mtime, size: s.size };
    }),
  );
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
 * 증분 빌드: 변경된 파일만 재파싱하고, 전체 노드 셋으로 그래프를 재구축한다.
 * "Incremental scan, full graph construction" 전략.
 *
 * @returns 빌드된 그래프, 또는 null (전체 빌드 폴백 필요)
 */
async function incrementalBuild(
  vaultPath: string,
  store: MetadataStore,
): Promise<KnowledgeGraph | null> {
  // 이전 스냅샷과 그래프 로드
  const [previousSnapshot, previousGraph] = await Promise.all([
    store.loadSnapshot(),
    store.loadGraph(),
  ]);

  if (!previousSnapshot || !previousGraph) {
    return null; // 폴백: 전체 빌드
  }

  // 현재 vault 스캔
  const files = await scanVault(vaultPath);
  const currentFileInfos = await toCurrentFileInfos(files);

  // 변경 세트 계산
  const changeSet = computeChangeSet(currentFileInfos, previousSnapshot);

  // 변경 없음 → 기존 그래프 반환
  if (
    changeSet.added.length === 0 &&
    changeSet.modified.length === 0 &&
    changeSet.deleted.length === 0
  ) {
    return previousGraph;
  }

  // 증분 범위 계산 (전체 빌드 권장 여부 확인)
  const scope = computeIncrementalScope(previousGraph, changeSet);
  if (scope.fullRebuildRecommended) {
    return null; // 폴백: 전체 빌드
  }

  // 이전 노드에서 시작
  const nodes = new Map(previousGraph.nodes);

  // 삭제된 노드 제거
  for (const deletedPath of changeSet.deleted) {
    nodes.delete(deletedPath as NodeId);
  }

  // 변경된 파일만 재파싱 (I/O 절약의 핵심)
  const fileMap = new Map(files.map((f) => [f.relativePath, f]));

  await Promise.all(
    scope.filesToReparse.map(async (filePath) => {
      const file = fileMap.get(filePath);
      if (!file) return;
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc);
        if (nodeResult.success && nodeResult.node) {
          nodes.set(nodeResult.node.id, nodeResult.node);
        }
      } catch {
        // 개별 파일 파싱 실패는 무시
      }
    }),
  );

  // 전체 노드 셋으로 그래프 재구축 (buildGraph/calculateWeights는 모놀리식)
  const nodeList = Array.from(nodes.values());
  const graphResult = buildGraph(nodeList);
  const { edges: weightedEdges, pageranks } = calculateWeights(
    graphResult.graph,
  );

  for (const [nodeId, rank] of pageranks) {
    const node = nodes.get(nodeId);
    if (node) {
      node.pagerank = rank;
    }
  }

  return {
    nodes,
    edges: weightedEdges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.size,
    edgeCount: weightedEdges.length,
  };
}

/**
 * kg_build 핸들러
 */
export async function handleKgBuild(
  vaultPath: string,
  input: KgBuildInput,
): Promise<KgBuildResult> {
  const startTime = Date.now();
  const store = new MetadataStore(vaultPath);

  try {
    let graph: KnowledgeGraph;
    let isIncremental = false;

    if (!input.force) {
      // 증분 빌드 시도
      const result = await incrementalBuild(vaultPath, store);
      if (result) {
        graph = result;
        isIncremental = true;
      } else {
        // 폴백: 전체 빌드
        graph = await fullBuild(vaultPath);
      }
    } else {
      // force=true → 항상 전체 빌드
      graph = await fullBuild(vaultPath);
    }

    // 그래프 저장
    await store.saveGraph(graph);
    await store.clearStaleNodes();

    // 스냅샷 저장
    const files = await scanVault(vaultPath);
    const snapshotEntries = await toCurrentFileInfos(files);
    await store.saveSnapshot(createSnapshot(snapshotEntries));

    const durationMs = Date.now() - startTime;
    const mode = isIncremental ? 'incremental' : 'full';

    return {
      success: true,
      path: vaultPath,
      message: `Index ${mode} build complete: ${graph.nodeCount} nodes, ${graph.edgeCount} edges (${durationMs}ms)`,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      durationMs,
      incremental: isIncremental,
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

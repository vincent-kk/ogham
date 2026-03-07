/**
 * @file kg-build.ts
 * @description kg_build 도구 핸들러 — 인덱스 전체/증분 빌드 트리거
 */
import { readFile, stat } from 'node:fs/promises';
import { posix } from 'node:path';

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
import type {
  AdjacencyList,
  EdgeTypeMap,
  EdgeWeightMap,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../types/graph.js';
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

/** 빌드 결과: 그래프 + 스캔된 파일 목록 (스냅샷 저장에 재사용) */
interface BuildOutput {
  graph: KnowledgeGraph;
  files: ScannedFile[];
}

/**
 * 엣지 배열로부터 EdgeWeightMap을 구축한다.
 * calculateWeights() 이후에 호출하여 최종 가중치를 반영한다.
 */
function buildEdgeWeightMap(edges: KnowledgeEdge[]): EdgeWeightMap {
  const map: EdgeWeightMap = new Map();
  for (const edge of edges) {
    let inner = map.get(edge.from);
    if (!inner) {
      inner = new Map();
      map.set(edge.from, inner);
    }
    inner.set(edge.to, edge.weight);
  }
  return map;
}

/**
 * 엣지 배열로부터 EdgeTypeMap을 구축한다.
 * SA에서 엣지 타입별 멀티플라이어를 적용하기 위한 O(1) 조회용.
 */
function buildEdgeTypeMap(edges: KnowledgeEdge[]): EdgeTypeMap {
  const map: EdgeTypeMap = new Map();
  for (const edge of edges) {
    let inner = map.get(edge.from);
    if (!inner) {
      inner = new Map();
      map.set(edge.from, inner);
    }
    inner.set(edge.to, edge.type);
  }
  return map;
}

/**
 * 엣지 배열로부터 AdjacencyList를 구축한다.
 */
function buildAdjacencyListFromEdges(
  nodes: Map<NodeId, KnowledgeNode>,
  edges: KnowledgeEdge[],
): AdjacencyList {
  const adj: AdjacencyList = new Map();
  for (const id of nodes.keys()) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    adj.get(edge.from)?.push(edge.to);
  }
  return adj;
}

/**
 * 파일명(stem) → 풀 경로 역인덱스를 구축한다.
 * 동일 파일명이 여러 경로에 존재하면 정렬 순서상 첫 번째 경로를 사용한다.
 */
/** @internal 테스트용 export */
export function buildStemIndex(
  nodes: Map<NodeId, KnowledgeNode>,
): Map<string, string> {
  const stemIndex = new Map<string, string>();
  const sortedPaths = Array.from(nodes.values())
    .map((n) => n.path)
    .sort();
  for (const fullPath of sortedPaths) {
    const filename = posix.basename(fullPath);
    if (!stemIndex.has(filename)) {
      stemIndex.set(filename, fullPath);
    }
  }
  return stemIndex;
}

/**
 * 수집된 링크를 해석하고 노드에 outboundLinks를 부착한다.
 * - 상대 경로 (./、../): 소스 파일 디렉토리 기준으로 resolve
 * - vault-root-relative 경로: 그대로 사용
 * - stem-only 폴백: 직접 매칭 실패 시 파일명으로 역인덱스 조회
 */
/** @internal 테스트용 export */
export function resolveAndAttachLinks(
  nodes: Map<NodeId, KnowledgeNode>,
  allLinks: Array<{ from: string; to: string }>,
): void {
  const nodePathSet = new Set(Array.from(nodes.values()).map((n) => n.path));
  let stemIndex: Map<string, string> | undefined;

  const linksBySource = new Map<string, string[]>();
  for (const link of allLinks) {
    if (!linksBySource.has(link.from)) linksBySource.set(link.from, []);
    const sourceDir = posix.dirname(link.from);
    const isRelative = link.to.startsWith('./') || link.to.startsWith('../');
    // 상대 경로 해석: ./、../ → vault-root-relative
    let resolved = isRelative
      ? posix.normalize(posix.join(sourceDir, link.to))
      : link.to;

    // stem-only 폴백: 직접 매칭 실패 시 파일명으로 역인덱스 조회
    if (!isRelative && !nodePathSet.has(resolved)) {
      if (!stemIndex) stemIndex = buildStemIndex(nodes);
      const filename = posix.basename(resolved);
      const stemResolved = stemIndex.get(filename);
      if (stemResolved) {
        resolved = stemResolved;
      }
    }

    linksBySource.get(link.from)!.push(resolved);
  }
  for (const [sourcePath, targets] of linksBySource) {
    const nodeId = sourcePath as NodeId;
    const node = nodes.get(nodeId);
    if (node) {
      node.outboundLinks = targets;
    }
  }
}

/**
 * 전체 vault를 스캔하고 그래프를 빌드하여 저장한다.
 */
async function fullBuild(vaultPath: string): Promise<BuildOutput> {
  const files = await scanVault(vaultPath);

  const nodes = new Map<NodeId, KnowledgeNode>();
  const allLinks: Array<{ from: string; to: string }> = [];

  await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
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
    if (node) {
      node.pagerank = rank;
    }
  }

  const builtAt = new Date().toISOString();
  const adjacencyList = buildAdjacencyListFromEdges(nodes, weightedEdges);
  const edgeWeightMap = buildEdgeWeightMap(weightedEdges);
  const edgeTypeMap = buildEdgeTypeMap(weightedEdges);
  const graph: KnowledgeGraph = {
    nodes,
    edges: weightedEdges,
    builtAt,
    nodeCount: nodes.size,
    edgeCount: weightedEdges.length,
    adjacencyList,
    edgeWeightMap,
    edgeTypeMap,
    invertedIndex: graphResult.invertedIndex,
  };

  return { graph, files };
}

/**
 * 증분 빌드: 변경된 파일만 재파싱하고, 전체 노드 셋으로 그래프를 재구축한다.
 * "Incremental scan, full graph construction" 전략.
 *
 * @returns 빌드 결과, 또는 null (전체 빌드 폴백 필요)
 */
async function incrementalBuild(
  vaultPath: string,
  store: MetadataStore,
): Promise<BuildOutput | null> {
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
    return { graph: previousGraph, files };
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
  const allLinks: Array<{ from: string; to: string }> = [];

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

          // 아웃바운드 링크 수집 (re-parsed 파일)
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

  // re-parsed 노드에 아웃바운드 링크 부착
  // carry-over 노드는 직렬화를 통해 outboundLinks가 보존됨
  resolveAndAttachLinks(nodes, allLinks);

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

  const incrAdjacencyList = buildAdjacencyListFromEdges(nodes, weightedEdges);
  const incrEdgeWeightMap = buildEdgeWeightMap(weightedEdges);
  const incrEdgeTypeMap = buildEdgeTypeMap(weightedEdges);
  return {
    graph: {
      nodes,
      edges: weightedEdges,
      builtAt: new Date().toISOString(),
      nodeCount: nodes.size,
      edgeCount: weightedEdges.length,
      adjacencyList: incrAdjacencyList,
      edgeWeightMap: incrEdgeWeightMap,
      edgeTypeMap: incrEdgeTypeMap,
      invertedIndex: graphResult.invertedIndex,
    },
    files,
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
    let scannedFiles: ScannedFile[];
    let isIncremental = false;

    if (!input.force) {
      // 증분 빌드 시도
      const result = await incrementalBuild(vaultPath, store);
      if (result) {
        graph = result.graph;
        scannedFiles = result.files;
        isIncremental = true;
      } else {
        // 폴백: 전체 빌드
        const full = await fullBuild(vaultPath);
        graph = full.graph;
        scannedFiles = full.files;
      }
    } else {
      // force=true → 항상 전체 빌드
      const full = await fullBuild(vaultPath);
      graph = full.graph;
      scannedFiles = full.files;
    }

    // 그래프 저장
    await store.saveGraph(graph);
    await store.clearStaleNodes();

    // 스냅샷 저장 (빌드 시 스캔한 파일 목록 재사용 — 중복 scanVault 방지)
    const snapshotEntries = await toCurrentFileInfos(scannedFiles);
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

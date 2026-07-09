/**
 * @file incrementalBuild.ts
 * @description 증분 빌드: 변경된 파일만 재파싱하고, 전체 노드 셋으로 그래프를 재구축한다.
 * "Incremental scan, full graph construction" 전략.
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
import {
  computeChangeSet,
  computeIncrementalScope,
} from '../../../../core/indexer/incrementalTracker/index.js';
import type { MetadataStore } from '../../../../core/indexer/metadataStore/index.js';
import type { ScannedFile } from '../../../../core/vaultScanner/index.js';
import { scanVault } from '../../../../core/vaultScanner/index.js';
import { calculateWeights } from '../../../../core/weightCalculator/index.js';
import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../../types/graph.js';
import type { BuildOutput, KgBuildParseFailure } from '../types/types.js';

import { resolveAndAttachLinks } from './resolveAndAttachLinks.js';
import { toCurrentFileInfos } from './toCurrentFileInfos.js';

async function reparseFiles(
  filesToReparse: string[],
  fileMap: Map<string, ScannedFile>,
  nodes: Map<NodeId, KnowledgeNode>,
  allLinks: Array<{ from: string; to: string }>,
  parseFailures: KgBuildParseFailure[],
): Promise<void> {
  await Promise.all(
    filesToReparse.map(async (filePath) => {
      const file = fileMap.get(filePath);
      if (!file) return;
      try {
        const content = await readFile(file.absolutePath, 'utf-8');
        const doc = parseDocument(file.relativePath, content, file.mtime);
        const nodeResult = buildKnowledgeNode(doc);
        if (nodeResult.success && nodeResult.node) {
          nodes.set(nodeResult.node.id, nodeResult.node);
          for (const link of doc.links)
            if (!link.isAbsolute)
              allLinks.push({ from: file.relativePath, to: link.href });
        } else
          parseFailures.push({
            path: file.relativePath,
            errors: doc.frontmatter.errors ?? [
              nodeResult.error ?? 'Unknown parse failure',
            ],
          });
      } catch (error) {
        parseFailures.push({
          path: file.relativePath,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    }),
  );
}

/**
 * @returns 빌드 결과, 또는 null (전체 빌드 폴백 필요)
 */
export async function incrementalBuild(
  vaultPath: string,
  store: MetadataStore,
): Promise<BuildOutput | null> {
  // 이전 스냅샷과 그래프 로드
  const [previousSnapshot, previousGraph] = await Promise.all([
    store.loadSnapshot(),
    store.loadGraph(),
  ]);

  if (!previousSnapshot || !previousGraph) return null; // 폴백: 전체 빌드

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
  )
    return { graph: previousGraph, files, parseFailures: [] };

  // 증분 범위 계산 (전체 빌드 권장 여부 확인)
  const scope = computeIncrementalScope(previousGraph, changeSet);
  if (scope.fullRebuildRecommended) return null; // 폴백: 전체 빌드

  // 이전 노드에서 시작
  const nodes = new Map(previousGraph.nodes);

  // 삭제된 노드 제거
  for (const deletedPath of changeSet.deleted)
    nodes.delete(deletedPath as NodeId);

  // 변경된 파일만 재파싱 (I/O 절약의 핵심)
  const fileMap = new Map(files.map((f) => [f.relativePath, f]));
  const allLinks: Array<{ from: string; to: string }> = [];
  const parseFailures: KgBuildParseFailure[] = [];

  await reparseFiles(
    scope.filesToReparse,
    fileMap,
    nodes,
    allLinks,
    parseFailures,
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
    if (node) node.pagerank = rank;
  }

  const graph: KnowledgeGraph = {
    nodes,
    edges: weightedEdges,
    builtAt: new Date().toISOString(),
    nodeCount: nodes.size,
    edgeCount: weightedEdges.length,
  };
  hydrateRuntimeMaps(graph);
  return {
    graph,
    files,
    parseFailures,
  };
}

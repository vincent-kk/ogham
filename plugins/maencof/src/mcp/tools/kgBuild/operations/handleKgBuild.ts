/**
 * @file handleKgBuild.ts
 * @description kg_build 핸들러 — 인덱스 전체/증분 빌드 트리거.
 */
import { createSnapshot } from '../../../../core/indexer/incrementalTracker/index.js';
import { MetadataStore } from '../../../../core/indexer/metadataStore/index.js';
import type { ScannedFile } from '../../../../core/vaultScanner/index.js';
import type { KnowledgeGraph } from '../../../../types/graph.js';
import type {
  KgBuildInput,
  KgBuildParseFailure,
  KgBuildResult,
} from '../types/types.js';

import { fullBuild } from './fullBuild.js';
import { incrementalBuild } from './incrementalBuild.js';
import { toCurrentFileInfos } from './toCurrentFileInfos.js';

export async function handleKgBuild(
  vaultPath: string,
  input: KgBuildInput,
): Promise<KgBuildResult> {
  const startTime = Date.now();
  const store = new MetadataStore(vaultPath);

  try {
    let graph: KnowledgeGraph;
    let scannedFiles: ScannedFile[];
    let parseFailures: KgBuildParseFailure[] = [];
    let isIncremental = false;

    if (!input.force) {
      // 증분 빌드 시도
      const result = await incrementalBuild(vaultPath, store);
      if (result) {
        graph = result.graph;
        scannedFiles = result.files;
        parseFailures = result.parseFailures;
        isIncremental = true;
      } else {
        // 폴백: 전체 빌드
        const full = await fullBuild(vaultPath);
        graph = full.graph;
        scannedFiles = full.files;
        parseFailures = full.parseFailures;
      }
    } else {
      // force=true → 항상 전체 빌드
      const full = await fullBuild(vaultPath);
      graph = full.graph;
      scannedFiles = full.files;
      parseFailures = full.parseFailures;
    }

    // 그래프 저장
    await store.saveGraph(graph);
    await store.clearStaleEntries();

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
      ...(parseFailures.length > 0 && { parseFailures }),
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

/**
 * @file incremental-tracker.ts
 * @description IncrementalTracker — mtime 기반 변경 감지, 부분 재인덱싱 범위 계산
 *
 * 전략:
 * - 변경 파일의 1-hop 이웃만 가중치 재계산
 * - PageRank 같은 전역 메트릭은 다음 전체 빌드까지 유지
 * - stale 노드 비율 10% 초과 시 전체 재빌드 권장
 */
import type { NodeId } from '../types/common.js';
import type { KnowledgeGraph } from '../types/graph.js';

import type { FileSnapshot, SnapshotEntry } from './metadata-store.js';

/** 변경 세트 */
export interface ChangeSet {
  /** 새로 추가된 파일 */
  added: string[];
  /** 수정된 파일 */
  modified: string[];
  /** 삭제된 파일 */
  deleted: string[];
  /** 변경 없는 파일 수 */
  unchanged: number;
}

/** 증분 업데이트 범위 */
export interface IncrementalScope {
  /** 재파싱이 필요한 파일 경로 목록 */
  filesToReparse: string[];
  /** 가중치 재계산이 필요한 노드 ID 목록 (변경 파일 + 1-hop 이웃) */
  nodesToReweight: NodeId[];
  /** 전체 재빌드 권장 여부 */
  fullRebuildRecommended: boolean;
  /** 권장 사유 */
  fullRebuildReason?: string;
}

/** 현재 스캔 파일 정보 (mtime, size) */
export interface CurrentFileInfo {
  path: string;
  mtime: number;
  size: number;
}

/**
 * 현재 파일 목록과 이전 스냅샷을 비교하여 변경 세트를 계산한다.
 *
 * @param currentFiles - 현재 파일 목록 (path, mtime, size)
 * @param snapshot - 이전 스냅샷 (null이면 전체 변경으로 처리)
 * @returns 변경 세트
 */
export function computeChangeSet(
  currentFiles: CurrentFileInfo[],
  snapshot: FileSnapshot | null,
): ChangeSet {
  if (!snapshot) {
    // 스냅샷 없음 → 모든 파일이 새로 추가된 것으로 처리
    return {
      added: currentFiles.map((f) => f.path),
      modified: [],
      deleted: [],
      unchanged: 0,
    };
  }

  const snapshotMap = new Map<string, SnapshotEntry>();
  for (const entry of snapshot.entries) {
    snapshotMap.set(entry.path, entry);
  }

  const currentMap = new Map<string, CurrentFileInfo>();
  for (const file of currentFiles) {
    currentMap.set(file.path, file);
  }

  const added: string[] = [];
  const modified: string[] = [];
  let unchanged = 0;

  // 추가 및 수정 탐지
  for (const [path, current] of currentMap) {
    const prev = snapshotMap.get(path);
    if (!prev) {
      added.push(path);
    } else if (current.mtime !== prev.mtime || current.size !== prev.size) {
      modified.push(path);
    } else {
      unchanged++;
    }
  }

  // 삭제 탐지
  const deleted: string[] = [];
  for (const [path] of snapshotMap) {
    if (!currentMap.has(path)) {
      deleted.push(path);
    }
  }

  return { added, modified, deleted, unchanged };
}

/**
 * 변경된 노드의 1-hop 이웃을 계산한다.
 *
 * @param graph - 현재 지식 그래프
 * @param changedPaths - 변경된 파일 경로 목록
 * @returns 1-hop 이웃 NodeId 집합 (변경 노드 포함)
 */
export function computeOneHopNeighbors(
  graph: KnowledgeGraph,
  changedPaths: string[],
): Set<NodeId> {
  const affected = new Set<NodeId>();

  // 변경된 노드 자신 추가
  for (const path of changedPaths) {
    const nodeId = path as NodeId;
    if (graph.nodes.has(nodeId)) {
      affected.add(nodeId);
    }
  }

  // 1-hop 이웃 탐색
  for (const edge of graph.edges) {
    if (affected.has(edge.from) && graph.nodes.has(edge.to)) {
      affected.add(edge.to);
    }
    if (affected.has(edge.to) && graph.nodes.has(edge.from)) {
      affected.add(edge.from);
    }
  }

  return affected;
}

/** 전체 재빌드 권장 임계값 */
const FULL_REBUILD_THRESHOLD = 0.1; // 10%

/**
 * 증분 업데이트 범위를 계산한다.
 *
 * @param graph - 현재 지식 그래프
 * @param changeSet - 변경 세트
 * @returns 증분 업데이트 범위
 */
export function computeIncrementalScope(
  graph: KnowledgeGraph,
  changeSet: ChangeSet,
): IncrementalScope {
  const allChanged = [
    ...changeSet.added,
    ...changeSet.modified,
    ...changeSet.deleted,
  ];
  const totalNodes = graph.nodeCount;

  // 변경 비율 계산
  const changeRatio = totalNodes > 0 ? allChanged.length / totalNodes : 1;

  // 전체 재빌드 권장 조건
  if (changeRatio > FULL_REBUILD_THRESHOLD) {
    return {
      filesToReparse: allChanged,
      nodesToReweight: [],
      fullRebuildRecommended: true,
      fullRebuildReason: `변경 비율 ${(changeRatio * 100).toFixed(1)}% > 임계값 ${FULL_REBUILD_THRESHOLD * 100}%`,
    };
  }

  // 재파싱 파일 = added + modified (deleted는 그래프에서 제거)
  const filesToReparse = [...changeSet.added, ...changeSet.modified];

  // 가중치 재계산 범위 = 변경 노드 + 1-hop 이웃
  const neighbors = computeOneHopNeighbors(graph, allChanged);
  const nodesToReweight = Array.from(neighbors);

  return {
    filesToReparse,
    nodesToReweight,
    fullRebuildRecommended: false,
  };
}

/**
 * 현재 파일 목록으로 새 스냅샷을 생성한다.
 */
export function createSnapshot(currentFiles: CurrentFileInfo[]): FileSnapshot {
  return {
    entries: currentFiles.map((f) => ({
      path: f.path,
      mtime: f.mtime,
      size: f.size,
    })),
    capturedAt: new Date().toISOString(),
  };
}

/** IncrementalTracker 클래스 */
export class IncrementalTracker {
  /**
   * 현재 파일 목록과 스냅샷을 비교하여 변경 세트를 반환한다.
   */
  computeChanges(
    currentFiles: CurrentFileInfo[],
    snapshot: FileSnapshot | null,
  ): ChangeSet {
    return computeChangeSet(currentFiles, snapshot);
  }

  /**
   * 증분 업데이트 범위를 계산한다.
   */
  computeScope(graph: KnowledgeGraph, changeSet: ChangeSet): IncrementalScope {
    return computeIncrementalScope(graph, changeSet);
  }

  /**
   * 현재 파일 목록으로 새 스냅샷을 생성한다.
   */
  snapshot(currentFiles: CurrentFileInfo[]): FileSnapshot {
    return createSnapshot(currentFiles);
  }
}

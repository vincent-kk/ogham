/**
 * @file computeIncrementalScope.ts
 * @description 증분 업데이트 범위를 계산한다.
 */
import { FULL_REBUILD_THRESHOLD } from '../../../../constants/thresholds.js';
import type { KnowledgeGraph } from '../../../../types/graph.js';
import type { ChangeSet, IncrementalScope } from '../types/types.js';

import { computeOneHopNeighbors } from './computeOneHopNeighbors.js';

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
  if (changeRatio > FULL_REBUILD_THRESHOLD)
    return {
      filesToReparse: allChanged,
      nodesToReweight: [],
      fullRebuildRecommended: true,
      fullRebuildReason: `Change ratio ${(changeRatio * 100).toFixed(1)}% > threshold ${FULL_REBUILD_THRESHOLD * 100}%`,
    };

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

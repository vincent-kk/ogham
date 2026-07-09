/**
 * @file incrementalTracker.ts
 * @description IncrementalTracker — mtime 기반 변경 감지, 부분 재인덱싱 범위 계산
 *
 * 전략:
 * - 변경 파일의 1-hop 이웃만 가중치 재계산
 * - PageRank 같은 전역 메트릭은 다음 전체 빌드까지 유지
 * - stale 노드 비율 10% 초과 시 전체 재빌드 권장
 */
import type { KnowledgeGraph } from '../../../../types/graph.js';
import type { FileSnapshot } from '../../metadataStore/index.js';
import type {
  ChangeSet,
  CurrentFileInfo,
  IncrementalScope,
} from '../types/types.js';

import { computeChangeSet } from './computeChangeSet.js';
import { computeIncrementalScope } from './computeIncrementalScope.js';
import { createSnapshot } from './createSnapshot.js';

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

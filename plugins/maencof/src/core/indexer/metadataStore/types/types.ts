/**
 * @file types.ts
 * @description metadataStore 공개 타입 — 스냅샷, 가중치, stale 엔트리.
 */

/** 파일 스냅샷 항목 */
export interface SnapshotEntry {
  /** 상대 경로 */
  path: string;
  /** 파일 수정 시간 (Unix timestamp ms) */
  mtime: number;
  /** 파일 크기 (bytes) */
  size: number;
}

/** 파일 스냅샷 */
export interface FileSnapshot {
  entries: SnapshotEntry[];
  capturedAt: string;
}

/** 가중치 저장 형식 */
export interface WeightsData {
  /** 엣지별 가중치 (from→to: weight) */
  edgeWeights: Array<{ from: string; to: string; weight: number }>;
  /** 노드별 PageRank 점수 */
  nodePageranks: Array<{ id: string; score: number }>;
  /** 계산 시간 */
  calculatedAt: string;
}

/** Stale 엔트리 — path 와 의도된 작업(op) 을 함께 기록한다. */
export interface StaleEntry {
  /** 변경 대상 노드 경로 */
  path: string;
  /** 작업 의도. 'mutate' = 생성/갱신 (read-and-replace), 'delete' = 노드 제거. */
  op: 'mutate' | 'delete';
}

/** Stale 엔트리 목록 */
export interface StaleEntries {
  entries: StaleEntry[];
  /** 마지막 업데이트 */
  updatedAt: string;
}

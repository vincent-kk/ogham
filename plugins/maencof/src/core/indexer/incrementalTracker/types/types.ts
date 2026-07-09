/**
 * @file types.ts
 * @description incrementalTracker 공개 타입 — 변경 세트, 증분 범위, 현재 파일 정보.
 */
import type { NodeId } from '../../../../types/common.js';

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

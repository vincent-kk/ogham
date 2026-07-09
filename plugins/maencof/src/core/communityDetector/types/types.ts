/**
 * @file types.ts
 * @description communityDetector 공개 타입 — 커뮤니티, 탐지 결과, 탐지 파라미터.
 */
import type { NodeId } from '../../../types/common.js';

/** 커뮤니티 — 노드 클러스터 */
export interface Community {
  /** 커뮤니티 식별자 */
  id: string;
  /** 소속 노드 ID 목록 */
  memberIds: NodeId[];
  /** 커뮤니티 대표 레이블 (주요 태그 또는 디렉토리) */
  label: string;
  /** 내부 엣지 밀도 (0.0 ~ 1.0) */
  density: number;
}

/**
 * 커뮤니티 탐지 결과
 */
export interface CommunityDetectionResult {
  /** 탐지된 커뮤니티 목록 */
  communities: Community[];
  /** 모듈성 점수 (0.0 ~ 1.0, 높을수록 좋은 클러스터링) */
  modularity: number;
  /** 탐지 알고리즘 이름 */
  algorithm: string;
}

/**
 * 커뮤니티 탐지 파라미터
 */
export interface CommunityDetectorParams {
  /** 최소 커뮤니티 크기 (기본: 2) */
  minCommunitySize?: number;
  /** 최대 커뮤니티 수 (기본: 무제한) */
  maxCommunities?: number;
  /** 해상도 파라미터 (Louvain용, 기본: 1.0) */
  resolution?: number;
}

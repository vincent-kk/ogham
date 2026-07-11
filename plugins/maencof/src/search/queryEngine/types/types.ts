/**
 * @file types.ts
 * @description queryEngine 공개 타입 — 시드 매칭, 튜닝 오버라이드, 검색 옵션/결과.
 */
import type { NodeId } from '../../../types/common.js';
import type { ActivationResult } from '../../../types/graph.js';

/** 시드 매칭 유형 */
export type MatchType =
  | 'path-exact'
  | 'title-exact'
  | 'title-word'
  | 'tag-exact'
  | 'tag-prefix';

/** 매칭 품질이 포함된 시드 */
export interface ScoredSeed {
  nodeId: NodeId;
  matchScore: number;
  matchType: MatchType;
}

/**
 * QGA-SA 매직넘버 오버라이드 — 수렴 실험(eval 스윕) 전용.
 * 미지정 필드는 constants/spreadingActivation.ts 기본값을 따른다.
 * 라이브 MCP 도구는 이 필드를 노출하지 않는다 (튜닝 확정 시 상수로 승격).
 */
export interface QgaTuning {
  /** 반복 횟수 T (지정 시 maxHops 매핑보다 우선) */
  iterations?: number;
  /** 갱신 임계값 τ */
  updateThreshold?: number;
  /** lexical 게이트 하한 γ */
  gateFloor?: number;
  /** 전역 감쇠 스케일 α_base */
  alphaBase?: number;
}

/** QueryEngine 검색 옵션 */
export interface QueryOptions {
  /** 최대 결과 수 (기본: 10) */
  maxResults?: number;
  /** v1 SA 감쇠 인자 — v1 은퇴로 무시됨 (MCP 스키마 호환용 유지; 아카이브 참조) */
  decay?: number;
  /** v1 발화 임계값 — v1 은퇴로 무시됨 (MCP 스키마 호환용 유지; 아카이브 참조) */
  threshold?: number;
  /** 탐색 반경 — QGA 반복 횟수 T로 매핑 (≤3→2, 5→3, ≥7→4; 기본: 5→3) */
  maxHops?: number;
  /** Layer 필터 (미지정 시 전체 Layer) */
  layerFilter?: number[];
  /** updated 시간창 하한 (YYYY-MM-DD, inclusive; 단독 지정 시 updated_after 의미) */
  since?: string;
  /** updated 시간창 상한 (YYYY-MM-DD, inclusive) */
  until?: string;
  /** 매직넘버 수렴 실험용 파라미터 오버라이드 (캐시 키에 포함) */
  tuning?: QgaTuning;
}

/** 검색 결과 */
export interface QueryResult {
  /** 활성화된 노드 목록 (score 내림차순) */
  results: ActivationResult[];
  /** 시드로 사용된 노드 ID 목록. path-exact 시드만 결과에서 제외되며, 키워드/태그 매칭 시드는 results에도 포함될 수 있다. */
  seedIds: NodeId[];
  /** 탐색된 총 노드 수 */
  exploredNodes: number;
  /** 검색 소요 시간 (ms) */
  durationMs: number;
}

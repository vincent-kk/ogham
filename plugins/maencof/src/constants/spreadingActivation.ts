import type { EdgeType } from '../types/common.js';

import { LINK_WEIGHT_FLOOR } from './weights.js';

/** 엣지 타입별 SA 활성화 멀티플라이어 (확산 시 가중치 보정). */
export const EDGE_TYPE_MULTIPLIER: Record<EdgeType, number> = {
  LINK: 1.0,
  PARENT_OF: 0.8,
  CHILD_OF: 0.8,
  SIBLING: 0.2,
  RELATIONSHIP: 0.7,
  CROSS_LAYER: 0.6,
  DOMAIN: 0.3,
};

/** QGA-SA 동기 반복 횟수 T (QA-SA 기본값) */
export const QGA_ITERATIONS = 3;

/** QGA-SA 갱신 임계값 τ — 게이트 적용 후 Δ 미만이면 반영하지 않음 */
export const QGA_UPDATE_THRESHOLD = 0.001;

/** QGA-SA lexical 게이트 하한 γ — 어휘 비중첩 노드의 구조 탐색 보존 */
export const QGA_GATE_FLOOR = 0.5;

/**
 * QGA-SA LINK 유효 가중치 하한 — 저장 계층 하한(LINK_WEIGHT_FLOOR)의 별칭.
 * 신규 빌드는 calculateWeights 가 저장 시점에 하한을 보장하므로, 이 SA측 하한은
 * 하한 도입 이전에 직렬화된 인덱스(weight 0 LINK 잔존)에 대한 방어선이다.
 */
export const QGA_LINK_WEIGHT_FLOOR = LINK_WEIGHT_FLOOR;

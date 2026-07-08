import type { EdgeType } from '../types/common.js';

/** 엣지 타입별 SA 활성화 멀티플라이어 (확산 시 가중치 보정). */
export const EDGE_TYPE_MULTIPLIER: Record<EdgeType, number> = {
  LINK: 1.0,
  PARENT_OF: 0.8,
  CHILD_OF: 0.8,
  SIBLING: 0.5,
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
 * QGA-SA LINK 유효 가중치 하한. SCS 경로 근사는 cross-folder wikilink 가중치를
 * 0으로 만들지만(공통 접두사 부재), 사용자 작성 링크는 최강 신호이므로 하한을 보장한다.
 * v2 전용 — v1 하드카피와 weightCalculator 는 건드리지 않는다.
 */
export const QGA_LINK_WEIGHT_FLOOR = 0.5;

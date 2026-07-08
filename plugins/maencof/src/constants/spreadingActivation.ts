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

/**
 * 노드별 SIBLING(폴더-형제) 확산 fanout 상한.
 * 대형 폴더 클리크(예: 97-노드 폴더 → 노드당 96 형제)가 균일 점수로 결과를 도배하고
 * SA를 O(클리크²)로 폭증시키는 것을 막는다. 확산 시 형제 이웃은 pagerank 상위 K개만 전파한다.
 * LINK/계층 등 의미 엣지에는 적용하지 않는다. queryEngine 만 이 상한을 opt-in 하며,
 * kgSuggestLinks 등 다른 호출자는 기본값(무제한)을 유지한다.
 */
export const SIBLING_FANOUT_CAP = 8;

/** 확산 엔진 식별자 — v1(하드카피 기준선) / v2(QGA-SA) */
export type SaEngine = 'legacy' | 'qga';

/**
 * queryEngine 기본 확산 엔진. 골든셋 ratchet 게이트에서 v2 우위가 확인된 커밋에서만
 * 'qga'로 전환한다 (설계서 04장 마이그레이션 규칙).
 */
export const SA_DEFAULT_ENGINE: SaEngine = 'legacy';

/** QGA-SA 동기 반복 횟수 T (QA-SA 기본값) */
export const QGA_ITERATIONS = 3;

/** QGA-SA 갱신 임계값 τ — 게이트 적용 후 Δ 미만이면 반영하지 않음 */
export const QGA_UPDATE_THRESHOLD = 0.01;

/** QGA-SA lexical 게이트 하한 γ — 어휘 비중첩 노드의 구조 탐색 보존 */
export const QGA_GATE_FLOOR = 0.3;

/**
 * QGA-SA LINK 유효 가중치 하한. SCS 경로 근사는 cross-folder wikilink 가중치를
 * 0으로 만들지만(공통 접두사 부재), 사용자 작성 링크는 최강 신호이므로 하한을 보장한다.
 * v2 전용 — v1 하드카피와 weightCalculator 는 건드리지 않는다.
 */
export const QGA_LINK_WEIGHT_FLOOR = 0.5;

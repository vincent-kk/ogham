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

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

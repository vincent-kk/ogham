import { Layer } from '../types/common.js';
import type { SubLayer } from '../types/common.js';

/**
 * 레이어별 SA 감쇠 인자 — 확산식 `A[j] = A[i] · W[i,j] · d` 의 `d` 다.
 * 노드가 내보내는 활성량에 **곱해지므로 값이 클수록 넓게 퍼진다**(감쇠되는 양이 아니다).
 * 축은 레이어 번호에 단조롭지 않고 U자형이다 — 정체성 코어와 미분류 임시 수용소라는
 * 양 극단이 좁게, 중간의 실질 지식이 넓게 퍼진다.
 */
export const LAYER_DECAY_FACTORS: Record<Layer, number> = {
  [Layer.L1_CORE]: 0.5,
  [Layer.L2_DERIVED]: 0.7,
  [Layer.L3_EXTERNAL]: 0.8,
  [Layer.L4_ACTION]: 0.9,
  [Layer.L5_CONTEXT]: 0.45,
};

/** L3 서브레이어별 감쇠 인자 — 방향은 LAYER_DECAY_FACTORS 와 같다. */
export const SUBLAYER_DECAY_FACTORS: Record<SubLayer, number> = {
  relational: 0.75,
  structural: 0.8,
  topical: 0.85,
};

/**
 * 허브 문서의 감쇠 인자 — 레이어·서브레이어 값을 덮어쓴다.
 * 다리 역할을 하는 노드가 전파를 막으면 다리가 아니므로 최댓값을 준다.
 */
export const HUB_DECAY_FACTOR = 0.95;

export const CYCLE_WEIGHT = 0.1;

export const SA_BONUS_WEIGHT = 0.3;

/**
 * LINK(위키링크) 저장 가중치 하한. SCS 경로 근사는 최상위 폴더를 가로지르는
 * 위키링크를 0으로 만들지만, 사용자 작성 링크는 최강 신호이므로 폴더 거리와
 * 무관하게 PageRank·SA 양쪽에서 전파되어야 한다.
 */
export const LINK_WEIGHT_FLOOR = 0.5;

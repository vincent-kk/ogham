/**
 * @file getLayerDecay.ts
 * @description 노드의 SA 감쇠 인자 반환. 우선순위는 허브 > 서브레이어 > 레이어.
 */
import {
  HUB_DECAY_FACTOR,
  LAYER_DECAY_FACTORS,
  SUBLAYER_DECAY_FACTORS,
} from '../../../constants/weights.js';
import type { Layer, SubLayer } from '../../../types/common.js';

/**
 * 노드가 확산 시 이웃으로 내보내는 활성량에 곱할 감쇠 인자를 반환한다.
 * 값이 클수록 넓게 퍼진다 — 감쇠되는 양이 아니다.
 *
 * @param layer - 노드의 레이어
 * @param subLayer - L3 서브레이어. 있으면 레이어 값을 대체한다
 * @param hub - 교차 연결 허브 여부. 참이면 레이어·서브레이어 값을 모두 덮어쓴다
 * @returns 감쇠 인자. 알 수 없는 레이어면 0.7
 */
export function getLayerDecay(
  layer: Layer,
  subLayer?: SubLayer,
  hub?: boolean,
): number {
  if (hub) return HUB_DECAY_FACTOR;

  if (subLayer && subLayer in SUBLAYER_DECAY_FACTORS)
    return SUBLAYER_DECAY_FACTORS[subLayer];

  return LAYER_DECAY_FACTORS[layer] ?? 0.7;
}

/**
 * @file getLayerDecay.ts
 * @description Layer별 감쇠 인자 반환. 서브레이어 지정 시 서브레이어 감쇠 사용.
 */
import {
  LAYER_DECAY_FACTORS,
  SUBLAYER_DECAY_FACTORS,
} from '../../../constants/weights.js';
import type { Layer, SubLayer } from '../../../types/common.js';

/**
 * Layer별 감쇠 인자 반환. 서브레이어 지정 시 서브레이어 감쇠 사용.
 */
export function getLayerDecay(layer: Layer, subLayer?: SubLayer): number {
  if (subLayer && subLayer in SUBLAYER_DECAY_FACTORS)
    return SUBLAYER_DECAY_FACTORS[subLayer];

  return LAYER_DECAY_FACTORS[layer] ?? 0.7;
}

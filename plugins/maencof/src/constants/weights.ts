import { Layer } from '../types/common.js';
import type { SubLayer } from '../types/common.js';

export const LAYER_DECAY_FACTORS: Record<Layer, number> = {
  [Layer.L1_CORE]: 0.5,
  [Layer.L2_DERIVED]: 0.7,
  [Layer.L3_EXTERNAL]: 0.8,
  [Layer.L4_ACTION]: 0.9,
  [Layer.L5_CONTEXT]: 0.95,
};

export const SUBLAYER_DECAY_FACTORS: Record<SubLayer, number> = {
  relational: 0.75,
  structural: 0.8,
  topical: 0.85,
  buffer: 0.95,
  boundary: 0.6,
};

export const CYCLE_WEIGHT = 0.1;

export const SA_BONUS_WEIGHT = 0.3;

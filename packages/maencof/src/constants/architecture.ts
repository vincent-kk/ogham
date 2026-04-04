import { Layer } from '../types/common.js';
import type { EdgeType, L3SubLayer, L5SubLayer } from '../types/common.js';

export const LAYER_DIR: Record<Layer, string> = {
  [Layer.L1_CORE]: '01_Core',
  [Layer.L2_DERIVED]: '02_Derived',
  [Layer.L3_EXTERNAL]: '03_External',
  [Layer.L4_ACTION]: '04_Action',
  [Layer.L5_CONTEXT]: '05_Context',
};

export const L3_SUBDIR: Record<L3SubLayer, string> = {
  relational: 'relational',
  structural: 'structural',
  topical: 'topical',
};

export const L5_SUBDIR: Record<L5SubLayer, string> = {
  buffer: 'buffer',
  boundary: 'boundary',
};

export const EXPECTED_ARCHITECTURE_VERSION = '2.0.0';

export const EDGE_TYPE = {
  LINK: 'LINK',
  PARENT_OF: 'PARENT_OF',
  CHILD_OF: 'CHILD_OF',
  SIBLING: 'SIBLING',
  RELATIONSHIP: 'RELATIONSHIP',
  CROSS_LAYER: 'CROSS_LAYER',
  DOMAIN: 'DOMAIN',
} as const satisfies Record<EdgeType, EdgeType>;

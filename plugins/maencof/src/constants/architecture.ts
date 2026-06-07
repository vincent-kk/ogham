import { Layer } from '../types/common.js';
import type { EdgeType, L3SubLayer, L5SubLayer } from '../types/common.js';

/** 각 레이어의 디렉토리 이름 매핑 */
export const LAYER_DIR: Record<Layer, string> = {
  [Layer.L1_CORE]: '01_Core',
  [Layer.L2_DERIVED]: '02_Derived',
  [Layer.L3_EXTERNAL]: '03_External',
  [Layer.L4_ACTION]: '04_Action',
  [Layer.L5_CONTEXT]: '05_Context',
};

/** L3 서브레이어 → 디렉토리 이름 매핑 */
export const L3_SUBDIR: Record<L3SubLayer, string> = {
  relational: 'relational',
  structural: 'structural',
  topical: 'topical',
};

/** L5 서브레이어 → 디렉토리 이름 매핑 */
export const L5_SUBDIR: Record<L5SubLayer, string> = {
  buffer: 'buffer',
  boundary: 'boundary',
};

/** 아키텍처 버전 (v2: L3 서브레이어 + L5 Buffer/Boundary) */
export const EXPECTED_ARCHITECTURE_VERSION = '2.0.0';

/** 그래프 엣지 유형 상수 */
export const EDGE_TYPE = {
  LINK: 'LINK',
  PARENT_OF: 'PARENT_OF',
  CHILD_OF: 'CHILD_OF',
  SIBLING: 'SIBLING',
  RELATIONSHIP: 'RELATIONSHIP',
  CROSS_LAYER: 'CROSS_LAYER',
  DOMAIN: 'DOMAIN',
} as const satisfies Record<EdgeType, EdgeType>;

/** 디렉토리 이름 → Layer 변환 */
export function layerFromDir(dirName: string): Layer | undefined {
  const entry = Object.entries(LAYER_DIR).find(([, dir]) => dir === dirName);
  return entry ? (Number(entry[0]) as Layer) : undefined;
}

/** Layer → 디렉토리 이름 변환 */
export function dirFromLayer(layer: Layer): string {
  return LAYER_DIR[layer];
}

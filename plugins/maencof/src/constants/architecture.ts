import { Layer } from '../types/common.js';
import type { EdgeType, SubLayer } from '../types/common.js';

/** 각 레이어의 디렉토리 이름 매핑 */
export const LAYER_DIR: Record<Layer, string> = {
  [Layer.L1_CORE]: '01_Core',
  [Layer.L2_DERIVED]: '02_Derived',
  [Layer.L3_EXTERNAL]: '03_External',
  [Layer.L4_ACTION]: '04_Action',
  [Layer.L5_CONTEXT]: '05_Context',
};

/**
 * L3 서브레이어 → 디렉토리 이름 매핑.
 * L5 는 서브레이어 없는 평면 구조라 대응하는 맵이 없다 — `05_Context/` 가 곧 자리다.
 */
export const L3_SUBDIR: Record<SubLayer, string> = {
  relational: 'relational',
  structural: 'structural',
  topical: 'topical',
};

/** 아키텍처 버전 (v3: L5 평면 임시 수용소 + 레이어 직교 hub 속성) */
export const EXPECTED_ARCHITECTURE_VERSION = '3.0.0';

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

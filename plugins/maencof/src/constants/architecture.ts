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
  clusterseed: 'clusterseeds',
};

/**
 * 서브디렉토리를 갖지 않는 평면 레이어. L1 은 파일 10개 이하의 최소 허브라 구조가
 * 필요 없고, L5 는 구조를 얻는 순간 제2의 분류 체계가 되는 미분류 임시 수용소다.
 */
export const FLAT_LAYERS: readonly Layer[] = [Layer.L1_CORE, Layer.L5_CONTEXT];

/**
 * 아키텍처 버전. v3 의 두 독립 변경: L5 는 서브레이어 없는 평면 임시 수용소가
 * 되었고, hub 는 레이어가 아닌 직교 frontmatter 속성이 되었다 — hub 는 L1~L4
 * 문서만 가능하며 L5 는 불가(버퍼는 다리가 되지 않는다).
 */
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

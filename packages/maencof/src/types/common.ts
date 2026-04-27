/**
 * @file common.ts
 * @description maencof 공통 타입 — Layer enum, NodeId, EdgeType, LinkDirection, AutonomyLevel, SubLayer.
 *
 * 런타임 상수 (LAYER_DIR / L3_SUBDIR / L5_SUBDIR / EDGE_TYPE / EXPECTED_ARCHITECTURE_VERSION)
 * 와 helper (layerFromDir / dirFromLayer) 는 constants/architecture.ts 에 위치.
 */

/** 5-Layer 지식 모델 계층 */
export enum Layer {
  L1_CORE = 1,
  L2_DERIVED = 2,
  L3_EXTERNAL = 3,
  L4_ACTION = 4,
  L5_CONTEXT = 5,
}

/** 노드 식별자 브랜드 타입 (파일 상대 경로) */
export type NodeId = string & { readonly __brand: 'NodeId' };

export function toNodeId(path: string): NodeId {
  return path as NodeId;
}

/** L3 서브레이어 */
export type L3SubLayer = 'relational' | 'structural' | 'topical';

/** L5 서브레이어 */
export type L5SubLayer = 'buffer' | 'boundary';

/** 서브레이어 유니온 */
export type SubLayer = L3SubLayer | L5SubLayer;

/** 그래프 엣지 유형 */
export type EdgeType =
  | 'LINK'
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'SIBLING'
  | 'RELATIONSHIP'
  | 'CROSS_LAYER'
  | 'DOMAIN';

/** 링크 방향 */
export type LinkDirection = 'outbound' | 'inbound' | 'bidirectional';

/** Progressive Autonomy Level (0-3) */
export type AutonomyLevel = 0 | 1 | 2 | 3;

/** 소스 타입 */
export type SourceType = 'markdown' | 'external' | 'generated' | 'imported';

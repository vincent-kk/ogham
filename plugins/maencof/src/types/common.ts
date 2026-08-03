/**
 * @file common.ts
 * @description maencof 공통 타입 — Layer enum, NodeId, EdgeType, LinkDirection, AutonomyLevel, SubLayer.
 *
 * 런타임 상수 (LAYER_DIR / L3_SUBDIR / EDGE_TYPE / EXPECTED_ARCHITECTURE_VERSION)
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

/**
 * 서브레이어 — Layer 3 의 방향성 분할이며, 서브레이어를 갖는 레이어는 L3 뿐이다.
 * Layer 5 는 서브레이어 없는 평면 임시 수용소이고, 교차 연결 허브는 레이어와
 * 직교하는 `hub` frontmatter 속성이다.
 */
export type SubLayer = 'relational' | 'structural' | 'topical';

/** L5 임시 수용소 항목의 종류 */
export type BufferType = 'snippet' | 'conversation' | 'unclassified';

/** L5 항목이 승격될 대상 — 서브레이어 이름 또는 레이어 토큰 */
export type PromotionTarget = SubLayer | 'L2';

/** 허브 문서의 종류 */
export type HubKind =
  'project_moc' | 'cross_domain' | 'synthesis' | 'study_hub';

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

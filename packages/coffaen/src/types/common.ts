/**
 * @file common.ts
 * @description coffaen 공통 기본 타입 — Layer enum, NodeId, EdgeType, LinkDirection, AutonomyLevel
 */

/** 5-Layer 지식 모델 계층 */
export enum Layer {
  L1_CORE = 1,
  L2_DERIVED = 2,
  L3_EXTERNAL = 3,
  L4_ACTION = 4,
  L5_CONTEXT = 5,
}

/** 각 레이어의 디렉토리 이름 매핑 */
export const LAYER_DIR: Record<Layer, string> = {
  [Layer.L1_CORE]: '01_Core',
  [Layer.L2_DERIVED]: '02_Derived',
  [Layer.L3_EXTERNAL]: '03_External',
  [Layer.L4_ACTION]: '04_Action',
  [Layer.L5_CONTEXT]: '05_Context',
};

/** 디렉토리 이름 → Layer 변환 */
export function layerFromDir(dirName: string): Layer | undefined {
  const entry = Object.entries(LAYER_DIR).find(([, dir]) => dir === dirName);
  return entry ? (Number(entry[0]) as Layer) : undefined;
}

/** Layer → 디렉토리 이름 변환 */
export function dirFromLayer(layer: Layer): string {
  return LAYER_DIR[layer];
}

/** 노드 식별자 브랜드 타입 (파일 상대 경로) */
export type NodeId = string & { readonly __brand: 'NodeId' };

export function toNodeId(path: string): NodeId {
  return path as NodeId;
}

/** 그래프 엣지 유형 */
export type EdgeType =
  | 'LINK'
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'SIBLING'
  | 'RELATIONSHIP';

/** 링크 방향 */
export type LinkDirection = 'outbound' | 'inbound' | 'bidirectional';

/** Progressive Autonomy Level (0-3) */
export type AutonomyLevel = 0 | 1 | 2 | 3;

/** 소스 타입 */
export type SourceType = 'markdown' | 'external' | 'generated' | 'imported';

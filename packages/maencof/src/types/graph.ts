/**
 * @file graph.ts
 * @description 지식 그래프 타입 — KnowledgeNode, KnowledgeEdge, KnowledgeGraph, AdjacencyList, ActivationResult
 */
import type { EdgeType, Layer, NodeId, SubLayer } from './common.js';
import type { Person } from './person.js';

/** 지식 노드 (마크다운 문서) */
export interface KnowledgeNode {
  id: NodeId;
  /** 파일 상대 경로 (vault 루트 기준) */
  path: string;
  /** 문서 제목 */
  title: string;
  /** Layer 속성 */
  layer: Layer;
  /** Frontmatter 태그 목록 */
  tags: string[];
  /** 최초 생성일 YYYY-MM-DD */
  created: string;
  /** 마지막 수정일 YYYY-MM-DD */
  updated: string;
  /** 파일 수정 시간 (mtime, Unix timestamp) */
  mtime: number;
  /** 세션별 참조 횟수 */
  accessed_count: number;
  /** PageRank 점수 */
  pagerank?: number;
  /** CF (Content Frequency) 점수 */
  cf?: number;
  /** 서브레이어 (L3: relational/structural/topical, L5: buffer/boundary) */
  subLayer?: SubLayer;
  /** 연결 레이어 목록 (L5-Boundary용) */
  connectedLayers?: number[];
  /** 경계 객체 유형 (L5-Boundary용) */
  boundaryType?: string;
  /** Person 메타데이터 (L3A relational용) */
  person?: Person;
  /** Domain 이름 (cross-layer 그룹핑용) */
  domain?: string;
  /** 문서에서 언급된 인물 목록 (모든 레이어, person_ref와 별개) */
  mentioned_persons?: string[];
  /** 아웃바운드 링크 목록 (vault-root-relative 경로, 빌드 시 document-parser에서 수집) */
  outboundLinks?: string[];
}

/** 그래프 엣지 */
export interface KnowledgeEdge {
  /** 출발 노드 ID */
  from: NodeId;
  /** 도착 노드 ID */
  to: NodeId;
  /** 엣지 유형 */
  type: EdgeType;
  /** 엣지 가중치 (Wu-Palmer 또는 SCS) */
  weight: number;
}

/** 전체 지식 그래프 */
export interface KnowledgeGraph {
  /** 노드 목록 (NodeId → KnowledgeNode) */
  nodes: Map<NodeId, KnowledgeNode>;
  /** 엣지 목록 */
  edges: KnowledgeEdge[];
  /** 빌드 타임스탬프 */
  builtAt: string;
  /** 총 노드 수 */
  nodeCount: number;
  /** 총 엣지 수 */
  edgeCount: number;
  /** 사전 계산된 인접 리스트 (SA/navigate O(1) 이웃 조회) */
  adjacencyList?: AdjacencyList;
  /** 사전 계산된 엣지 가중치 맵 (SA O(1) 가중치 조회) */
  edgeWeightMap?: EdgeWeightMap;
  /** 사전 계산된 엣지 타입 맵 (SA O(1) 엣지 타입 조회) */
  edgeTypeMap?: EdgeTypeMap;
  /** 사전 계산된 역 인덱스 (키워드 시드 O(1) 조회) */
  invertedIndex?: InvertedIndex;
}

/** 인접 리스트 (NodeId → 이웃 NodeId[]) */
export type AdjacencyList = Map<NodeId, NodeId[]>;

/** 엣지 가중치 맵 (from → to → weight) — O(1) 가중치 조회용 */
export type EdgeWeightMap = Map<NodeId, Map<NodeId, number>>;

/** 엣지 타입 맵 (from → to → EdgeType) — SA O(1) 엣지 타입 조회용 */
export type EdgeTypeMap = Map<NodeId, Map<NodeId, EdgeType>>;

/** 역 인덱스 (lowercase term → NodeId Set) — 키워드 시드 해석용 */
export type InvertedIndex = Map<string, Set<NodeId>>;

/** 확산 활성화 결과 */
export interface ActivationResult {
  /** 노드 ID */
  nodeId: NodeId;
  /** 활성화 점수 (0.0 ~ 1.0) */
  score: number;
  /** 시드로부터의 홉 거리 */
  hops: number;
  /** 경로 (시드 → 현재 노드) */
  path: NodeId[];
}

/** 직렬화 가능한 그래프 (JSON 저장용) */
export interface SerializedGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  builtAt: string;
  nodeCount: number;
  edgeCount: number;
}

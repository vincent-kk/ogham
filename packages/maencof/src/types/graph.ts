/**
 * @file graph.ts
 * @description 지식 그래프 타입 — KnowledgeNode, KnowledgeEdge, KnowledgeGraph, AdjacencyList, ActivationResult
 */
import type { EdgeType, Layer, NodeId } from './common.js';

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
}

/** 인접 리스트 (NodeId → 이웃 NodeId[]) */
export type AdjacencyList = Map<NodeId, NodeId[]>;

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

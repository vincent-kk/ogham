/**
 * @file types.ts
 * @description graphBuilder 공개 타입 — 빌드 옵션과 빌드 결과.
 */
import type { NodeId } from '../../../types/common.js';
import type {
  AdjacencyList,
  InvertedIndex,
  KnowledgeGraph,
} from '../../../types/graph.js';

/** GraphBuilder 옵션 */
export interface GraphBuilderOptions {
  /** 고립 노드 포함 여부 (기본: true) */
  includeOrphans?: boolean;
}

/** GraphBuilder 결과 */
export interface GraphBuildResult {
  graph: KnowledgeGraph;
  adjacencyList: AdjacencyList;
  invertedIndex: InvertedIndex;
  orphanNodes: NodeId[];
}

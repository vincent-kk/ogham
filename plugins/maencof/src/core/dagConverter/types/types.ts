/**
 * @file types.ts
 * @description dagConverter 공개 타입 — DAG 변환 결과.
 */
import type { KnowledgeEdge, KnowledgeGraph } from '../../../types/graph.js';

/** DAG 변환 결과 */
export interface DAGConvertResult {
  /** 변환된 그래프 (순환 엣지 가중치 약화) */
  graph: KnowledgeGraph;
  /** 약화된 순환 엣지 목록 */
  weakenedEdges: KnowledgeEdge[];
  /** 탐지된 순환 수 */
  cycleCount: number;
}

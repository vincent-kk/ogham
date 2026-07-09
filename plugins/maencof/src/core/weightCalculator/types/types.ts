/**
 * @file types.ts
 * @description weightCalculator 공개 타입 — 가중치 계산 결과.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeEdge } from '../../../types/graph.js';

/** 가중치 계산 결과 */
export interface WeightCalcResult {
  /** 가중치가 적용된 엣지 목록 */
  edges: KnowledgeEdge[];
  /** 노드별 PageRank 점수 (선택적 계산) */
  pageranks: Map<NodeId, number>;
}

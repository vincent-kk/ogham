/**
 * @file buildInvertedIndex.ts
 * @description 역 인덱스 구축 — lowercase term → NodeId Set 매핑.
 */
import type { NodeId } from '../../../types/common.js';
import type { InvertedIndex, KnowledgeNode } from '../../../types/graph.js';

import { addNodeToInvertedIndex } from './addNodeToInvertedIndex.js';

/**
 * 역 인덱스 구축: 노드 제목(단어 분리)과 태그를 lowercase term → NodeId Set 으로 매핑.
 * 키워드 시드 해석 시 prefix matching 으로 O(terms) 조회 지원.
 */
export function buildInvertedIndex(
  nodeMap: Map<NodeId, KnowledgeNode>,
): InvertedIndex {
  const index: InvertedIndex = new Map();
  for (const node of nodeMap.values()) addNodeToInvertedIndex(index, node);

  return index;
}

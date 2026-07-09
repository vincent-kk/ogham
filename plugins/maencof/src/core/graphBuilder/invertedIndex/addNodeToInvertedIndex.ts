/**
 * @file addNodeToInvertedIndex.ts
 * @description 단일 노드를 invertedIndex 에 추가한다 (term Set 에 nodeId 합집합).
 */
import type { InvertedIndex, KnowledgeNode } from '../../../types/graph.js';

import { tokenizeForInvertedIndex } from './tokenizeForInvertedIndex.js';

/**
 * 단일 노드를 invertedIndex 에 추가한다 (term Set 에 nodeId 합집합).
 * `index` 가 undefined 면 no-op.
 */
export function addNodeToInvertedIndex(
  index: InvertedIndex | undefined,
  node: KnowledgeNode,
): void {
  if (!index) return;
  for (const term of tokenizeForInvertedIndex(node)) {
    let set = index.get(term);
    if (!set) {
      set = new Set();
      index.set(term, set);
    }
    set.add(node.id);
  }
}

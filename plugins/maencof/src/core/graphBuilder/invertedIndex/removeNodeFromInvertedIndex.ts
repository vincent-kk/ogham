/**
 * @file removeNodeFromInvertedIndex.ts
 * @description 단일 노드를 invertedIndex 에서 제거한다 (빈 term Set 은 삭제).
 */
import type { InvertedIndex, KnowledgeNode } from '../../../types/graph.js';

import { tokenizeForInvertedIndex } from './tokenizeForInvertedIndex.js';

/**
 * 단일 노드를 invertedIndex 에서 제거한다. term Set 이 비면 term 자체 삭제 (term 누수 방지).
 * `index` 가 undefined 면 no-op.
 */
export function removeNodeFromInvertedIndex(
  index: InvertedIndex | undefined,
  node: KnowledgeNode,
): void {
  if (!index) return;
  for (const term of tokenizeForInvertedIndex(node)) {
    const set = index.get(term);
    if (!set) continue;
    set.delete(node.id);
    if (set.size === 0) index.delete(term);
  }
}

/**
 * @file tokenizeForInvertedIndex.ts
 * @description 노드의 invertedIndex 토큰 구성 — title 단어 + tags + mentioned_persons.
 */
import { WORD_BOUNDARY_SPLIT_REGEX } from '../../../constants/regexes.js';
import type { KnowledgeNode } from '../../../types/graph.js';

/**
 * 노드의 invertedIndex 토큰을 구성한다 — title 단어 + tags + mentioned_persons (lowercase, 공백 제외).
 *
 * 본 함수는 buildInvertedIndex 와 incremental add/remove 헬퍼의 단일 출처로,
 * tokenization drift 를 차단한다.
 */
export function tokenizeForInvertedIndex(node: KnowledgeNode): string[] {
  const terms: string[] = [];
  for (const word of node.title.split(WORD_BOUNDARY_SPLIT_REGEX)) {
    const lower = word.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  for (const tag of node.tags) {
    const lower = tag.toLowerCase();
    if (lower.length > 0) terms.push(lower);
  }
  if (node.mentioned_persons)
    for (const person of node.mentioned_persons) {
      const lower = person.toLowerCase();
      if (lower.length > 0) terms.push(lower);
    }

  return terms;
}

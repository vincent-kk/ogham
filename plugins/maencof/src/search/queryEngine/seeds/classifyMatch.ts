/**
 * @file classifyMatch.ts
 * @description 노드에 대한 키워드 매칭 품질을 분류한다.
 * InvertedIndex는 title/tag 출처를 구분하지 않으므로, post-lookup으로 node를 재검사한다.
 */
import type { MatchType } from '../types/types.js';

export function classifyMatch(
  node: { title: string; tags: string[] },
  keyword: string,
): { score: number; type: MatchType } {
  const kw = keyword.toLowerCase();
  const titleLower = node.title.toLowerCase();

  // title exact match
  if (titleLower === kw) return { score: 1.0, type: 'title-exact' };

  // title word boundary match
  const titleWords = titleLower.split(/[\s\-_/\\.,;:!?()[\]{}'"]+/);
  if (titleWords.some((w) => w === kw))
    return { score: 0.8, type: 'title-word' };

  // tag exact match
  if (node.tags.some((t) => t.toLowerCase() === kw))
    return { score: 0.5, type: 'tag-exact' };

  // tag prefix match
  if (node.tags.some((t) => t.toLowerCase().startsWith(kw)))
    return { score: 0.3, type: 'tag-prefix' };

  // title contains keyword (fallback — still a match via inverted index)
  if (titleLower.includes(kw)) return { score: 0.8, type: 'title-word' };

  return { score: 0.3, type: 'tag-prefix' };
}

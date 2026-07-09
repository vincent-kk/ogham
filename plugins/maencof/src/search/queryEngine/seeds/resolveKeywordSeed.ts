/**
 * @file resolveKeywordSeed.ts
 * @description 키워드 시드의 후보를 매칭 품질로 분류하고(IDF 스케일 적용) 시드 budget 을
 * 적용해 bestScores 에 병합한다.
 */
import { KEYWORD_SEED_CAP } from '../../../constants/queryEngine.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import { normalizePhrase } from '../tokenize/normalizePhrase.js';
import type { MatchType, ScoredSeed } from '../types/types.js';

import { classifyMatch } from './classifyMatch.js';
import { classifyMultiToken } from './classifyMultiToken.js';
import type { ResolvedKeywordSeed } from './resolveKeywordTokens.js';

/** 후보 집합들의 교집합 (다토큰 AND). 빈 입력/빈 집합이면 빈 결과. */
function intersectCandidateSets(sets: Set<NodeId>[]): Set<NodeId> {
  if (sets.length === 0) return new Set();
  let smallest = sets[0]!;
  for (const s of sets) if (s.size < smallest.size) smallest = s;
  const result = new Set<NodeId>();
  for (const id of smallest) if (sets.every((s) => s.has(id))) result.add(id);

  return result;
}

export function resolveKeywordSeed(
  graph: KnowledgeGraph,
  resolved: ResolvedKeywordSeed,
  idfScale: number,
  bestScores: Map<NodeId, ScoredSeed>,
): void {
  const { seed, tokens, candidateSets } = resolved;
  const multiToken = tokens.length > 1;
  const candidateIds = multiToken
    ? intersectCandidateSets(candidateSets)
    : candidateSets[0]!;

  const phrase = multiToken ? normalizePhrase(seed) : '';

  // 먼저 모든 후보를 매칭 품질로 분류한다. 시드 budget 은 분류 이후에 적용해야,
  // pagerank 가 낮은 고품질(title) 매칭이 pagerank 높은 저품질(tag) 매칭에 밀려
  // 탈락하는 것을 막는다 (title > tag 점수 갭 보존).
  const scored: Array<{
    id: NodeId;
    score: number;
    type: MatchType;
    pagerank: number;
  }> = [];
  for (const id of candidateIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    const { score, type } = multiToken
      ? classifyMultiToken(node, tokens, phrase)
      : classifyMatch(node, tokens[0]!);
    scored.push({
      id,
      score: Math.min(1, score * idfScale),
      type,
      pagerank: node.pagerank ?? 0,
    });
  }

  // 허브 토큰 시드 budget: score 우선 → pagerank → id 로 결정적 정렬 후 상위 K개만 채택.
  // 균일 점수의 허브 태그(예: `security` 127노드)는 여전히 pagerank 로 캡되지만,
  // 고품질 title 매칭은 점수 우선이므로 보존된다.
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.pagerank - a.pagerank ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  for (const { id, score, type } of scored.slice(0, KEYWORD_SEED_CAP)) {
    const existing = bestScores.get(id);
    if (!existing || existing.matchScore < score)
      bestScores.set(id, { nodeId: id, matchScore: score, matchType: type });
  }
}

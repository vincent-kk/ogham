/**
 * @file resolveKeywordSeed.ts
 * @description 키워드 시드의 후보를 매칭 품질로 분류하고(IDF 스케일 적용) 시드 budget 을
 * 적용해 bestScores 에 병합한다. 반환값은 budget 캡 이전의 분류 후보 수다 (0 = 미해석).
 */
import {
  COMPOUND_FALLBACK_MIN_TOKEN_LENGTH,
  COMPOUND_OR_MATCH_SCORE,
  KEYWORD_SEED_CAP,
} from '../../../constants/queryEngine.js';
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

/** 후보 집합들의 합집합 (compound 분해 OR 폴백 전용). */
function unionCandidateSets(sets: Set<NodeId>[]): Set<NodeId> {
  const result = new Set<NodeId>();
  for (const s of sets) for (const id of s) result.add(id);

  return result;
}

export function resolveKeywordSeed(
  graph: KnowledgeGraph,
  resolved: ResolvedKeywordSeed,
  idfScale: number,
  bestScores: Map<NodeId, ScoredSeed>,
  compoundOrScore: number = COMPOUND_OR_MATCH_SCORE,
): number {
  const { seed, tokens, candidateSets, compoundFallback } = resolved;
  const multiToken = tokens.length > 1;
  // compound 시드도 분해 AND 가 우선이다 — AND 가 살아 있으면 기존 다토큰 의미론과
  // 완전히 같다. AND 공집합일 때만 OR 로 확장하며, 1자 토큰은 union 에서 제외한다
  // (prefix 후보 폭발 차단).
  const andIds = multiToken
    ? intersectCandidateSets(candidateSets)
    : candidateSets[0]!;
  const orFallbackActive = compoundFallback === true && andIds.size === 0;
  const candidateIds = orFallbackActive
    ? unionCandidateSets(
        candidateSets.filter(
          (_, i) => tokens[i]!.length >= COMPOUND_FALLBACK_MIN_TOKEN_LENGTH,
        ),
      )
    : andIds;

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
    // OR 폴백이 켜졌다면 AND 공집합이 전제이므로 모든 후보가 부분 매칭이다 —
    // 일괄 compound-or 저득점으로 계수한다 (AND 가 살아 있는 경로는 불변).
    const { score, type } = orFallbackActive
      ? { score: compoundOrScore, type: 'compound-or' as MatchType }
      : multiToken
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

  return scored.length;
}

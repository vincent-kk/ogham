/**
 * @file resolveKeywordTokens.ts
 * @description 키워드 시드를 토큰화하고 토큰별 후보 집합과 대표 IDF 를 계산한다.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import { tokenizeSeed } from '../tokenize/tokenizeSeed.js';

import { candidatesForToken } from './candidatesForToken.js';
import { classifyMatch } from './classifyMatch.js';

/** 키워드 시드의 사전 해석 결과 — 토큰화 + 토큰별 후보 집합 + 시드 대표 IDF */
export interface ResolvedKeywordSeed {
  seed: string;
  tokens: string[];
  candidateSets: Set<NodeId>[];
  /** 후보가 있는 토큰 중 최대 IDF — 가장 희귀한 토큰이 시드의 변별력을 결정한다. 후보 전무 시 0. */
  idf: number;
  /** compound(공백 없는 다토큰) 시드가 원형 매칭에 실패해 분해 OR 폴백 대상임 */
  compoundFallback?: boolean;
}

/** smooth IDF — df 는 후보 집합 크기(prefix 매칭 의미론과 동일 분모) */
function idfOf(nodeCount: number, df: number): number {
  return Math.log(1 + nodeCount / df);
}

/** prefix 후보 중 원형이 태그/제목에 그대로 존재하는 노드가 있는지 검사한다. */
function hasVerbatimHit(
  graph: KnowledgeGraph,
  ids: Set<NodeId>,
  raw: string,
): boolean {
  for (const id of ids) {
    const node = graph.nodes.get(id);
    if (node && classifyMatch(node, raw).type !== 'tag-prefix') return true;
  }
  return false;
}

export function resolveKeywordTokens(
  graph: KnowledgeGraph,
  seed: string,
  tokenCandidateCache: Map<string, Set<NodeId>>,
): ResolvedKeywordSeed | null {
  const tokens = tokenizeSeed(seed);
  if (tokens.length === 0) return null;

  // C안 원형 우선: 태그는 통짜 term 으로 색인되므로, kebab/snake(공백 없이
  // `-`/`_` 로 결합된 다토큰) 시드는 분해 전에 원형 그대로 조회한다. prefix
  // 후보만으로는 채택하지 않는다 — 원형 완전 일치(태그 exact 또는 제목 내
  // verbatim)가 실존할 때만 단일 토큰 경로로 흘리고, 아니면 분해 AND 가 정답
  // 문서를 지킨다. raw 는 분리자를 포함하므로 일반 토큰 캐시 키와 충돌하지 않는다.
  const raw = seed.trim().toLowerCase();
  const compound =
    tokens.length > 1 && !/\s/.test(seed.trim()) && /[-_]/.test(seed);
  if (compound) {
    let rawSet = tokenCandidateCache.get(raw);
    if (!rawSet) {
      rawSet = candidatesForToken(graph, raw);
      tokenCandidateCache.set(raw, rawSet);
    }
    if (rawSet.size > 0 && hasVerbatimHit(graph, rawSet, raw))
      return {
        seed,
        tokens: [raw],
        candidateSets: [rawSet],
        idf: idfOf(graph.nodes.size, rawSet.size),
      };
  }

  const candidateSets = tokens.map((token) => {
    let set = tokenCandidateCache.get(token);
    if (!set) {
      set = candidatesForToken(graph, token);
      tokenCandidateCache.set(token, set);
    }
    return set;
  });

  let idf = 0;
  for (const set of candidateSets)
    if (set.size > 0) idf = Math.max(idf, idfOf(graph.nodes.size, set.size));

  return {
    seed,
    tokens,
    candidateSets,
    idf,
    ...(compound && { compoundFallback: true }),
  };
}

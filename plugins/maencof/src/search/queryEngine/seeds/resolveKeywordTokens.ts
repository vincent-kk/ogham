/**
 * @file resolveKeywordTokens.ts
 * @description 키워드 시드를 토큰화하고 토큰별 후보 집합과 대표 IDF 를 계산한다.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import { tokenizeSeed } from '../tokenize/tokenizeSeed.js';

import { candidatesForToken } from './candidatesForToken.js';

/** 키워드 시드의 사전 해석 결과 — 토큰화 + 토큰별 후보 집합 + 시드 대표 IDF */
export interface ResolvedKeywordSeed {
  seed: string;
  tokens: string[];
  candidateSets: Set<NodeId>[];
  /** 후보가 있는 토큰 중 최대 IDF — 가장 희귀한 토큰이 시드의 변별력을 결정한다. 후보 전무 시 0. */
  idf: number;
}

/** smooth IDF — df 는 후보 집합 크기(prefix 매칭 의미론과 동일 분모) */
function idfOf(nodeCount: number, df: number): number {
  return Math.log(1 + nodeCount / df);
}

export function resolveKeywordTokens(
  graph: KnowledgeGraph,
  seed: string,
  tokenCandidateCache: Map<string, Set<NodeId>>,
): ResolvedKeywordSeed | null {
  const tokens = tokenizeSeed(seed);
  if (tokens.length === 0) return null;

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

  return { seed, tokens, candidateSets, idf };
}

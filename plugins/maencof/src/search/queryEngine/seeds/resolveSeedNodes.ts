/**
 * @file resolveSeedNodes.ts
 * @description 쿼리 문자열에서 시드 노드를 결정한다.
 *
 * 전략:
 * 1. 쿼리가 '.md'로 끝나거나 '/'를 포함하면 파일 경로로 처리 (score=1.0)
 * 2. 그 외: InvertedIndex prefix matching → post-lookup classification,
 *    쿼리 내 상대 IDF(`시드 idf / 쿼리 최대 idf`)로 매칭 점수를 스케일한다.
 *
 * 상대 IDF 는 흔한 토큰(다수 문서 매칭)이 희귀 토큰과 같은 점수 평탄대로 승격되어
 * 동형이의어 노이즈를 시드하는 것을 막는다. 후보 union 은 불변(순위만 교정)이고,
 * 변별 토큰이 하나뿐인 쿼리(단일 시드 포함)는 스케일 1로 기존과 동일하다.
 */
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { ResolvedSeedNodes, ScoredSeed } from '../types/types.js';

import { isPathSeed } from './isPathSeed.js';
import { resolveKeywordSeed } from './resolveKeywordSeed.js';
import { resolveKeywordTokens } from './resolveKeywordTokens.js';
import { resolvePathSeed } from './resolvePathSeed.js';

/**
 * @param graph - 지식 그래프
 * @param seeds - 시드 후보 (경로 또는 키워드)
 * @param opts - compoundOrScore: compound 분해 OR 폴백 점수 오버라이드 (스윕 전용)
 * @returns 채택 시드 노드 목록과 시드별 어휘 매칭 계수 (0 = 미해석)
 */
export function resolveSeedNodes(
  graph: KnowledgeGraph,
  seeds: string[],
  opts?: { compoundOrScore?: number },
): ResolvedSeedNodes {
  const bestScores = new Map<NodeId, ScoredSeed>();
  // Object.create(null): '__proto__' 같은 프로토타입 이름의 시드도 키로 실려야 한다
  const seedCounts: Record<string, number> = Object.create(null);

  const tokenCandidateCache = new Map<string, Set<NodeId>>();
  const resolvedKeywordSeeds = seeds.map((seed) =>
    isPathSeed(seed)
      ? null
      : resolveKeywordTokens(graph, seed, tokenCandidateCache),
  );
  let idfMax = 0;
  for (const resolved of resolvedKeywordSeeds)
    if (resolved) idfMax = Math.max(idfMax, resolved.idf);

  seeds.forEach((seed, i) => {
    if (isPathSeed(seed)) {
      seedCounts[seed] = resolvePathSeed(graph, seed, bestScores);
      return;
    }
    const resolved = resolvedKeywordSeeds[i];
    if (!resolved) {
      seedCounts[seed] = 0;
      return;
    }
    const idfScale = idfMax > 0 && resolved.idf > 0 ? resolved.idf / idfMax : 1;
    seedCounts[seed] = resolveKeywordSeed(
      graph,
      resolved,
      idfScale,
      bestScores,
      opts?.compoundOrScore,
    );
  });

  return { scored: Array.from(bestScores.values()), seedCounts };
}

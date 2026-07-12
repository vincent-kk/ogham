/**
 * @file calculateWeights.ts
 * @description 그래프의 모든 엣지 가중치를 계산한다 — 타입별 알고리즘 + PageRank.
 */
import { LINK_WEIGHT_FLOOR } from '../../../constants/weights.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import type { WeightCalcResult } from '../types/types.js';

import { computePageRank } from './computePageRank.js';

/**
 * 그래프의 모든 엣지 가중치를 계산한다.
 * - LINK: SCS 기반, LINK_WEIGHT_FLOOR 하한 (cross-folder 사용자 링크 보존)
 * - PARENT_OF / CHILD_OF / SIBLING: Wu-Palmer 기반
 * - RELATIONSHIP: intimacy_level 매핑, CROSS_LAYER: 1.0, DOMAIN: 0.3
 */
export function calculateWeights(graph: KnowledgeGraph): WeightCalcResult {
  const edges = graph.edges.map((edge) => ({
    ...edge,
    weight: computeEdgeWeight(edge, graph),
  }));

  // PageRank 는 재계산 전 초기 가중치(LINK=1.0) 기준 — 사용자 링크는 폴더 거리와 무관하게 전파된다.
  const pageranks = computePageRank(graph);

  return { edges, pageranks };
}

/** 개별 엣지 가중치 계산 (타입별 분기). */
function computeEdgeWeight(edge: KnowledgeEdge, graph: KnowledgeGraph): number {
  const fromNode = graph.nodes.get(edge.from);
  const toNode = graph.nodes.get(edge.to);

  if (!fromNode || !toNode) return 1.0;

  switch (edge.type) {
    case 'LINK':
      return Math.max(computeSCSWeight(fromNode, toNode), LINK_WEIGHT_FLOOR);
    case 'PARENT_OF':
    case 'CHILD_OF':
    case 'SIBLING':
      return computeWuPalmerWeight(fromNode, toNode);
    case 'RELATIONSHIP':
      return computeRelationshipWeight(fromNode, toNode);
    case 'CROSS_LAYER':
      return 1.0;
    case 'DOMAIN':
      return 0.3;
    default:
      return 1.0;
  }
}

/**
 * Wu-Palmer 유사도 (디렉토리 트리 LCS 깊이 기반).
 * P0: 경로 깊이 차이로 근사. 동일 디렉토리 = 1.0, 멀수록 낮아짐.
 */
function computeWuPalmerWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const depthA = getPathDepth(a.path);
  const depthB = getPathDepth(b.path);
  const lcsDepth = getLCSDepth(a.path, b.path);

  // Wu-Palmer: 2 * depth(LCS) / (depth(a) + depth(b))
  const denominator = depthA + depthB;
  if (denominator === 0) return 1.0;
  return Math.min(1.0, (2 * lcsDepth) / denominator);
}

/**
 * RELATIONSHIP 엣지 가중치 계산.
 * intimacy_level 1-5 → 0.2-1.0 선형 매핑: 0.2 + (avg - 1) * 0.2
 */
function computeRelationshipWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const aExt = a as KnowledgeNode & { person?: { intimacy_level?: number } };
  const bExt = b as KnowledgeNode & { person?: { intimacy_level?: number } };
  const levelA = aExt.person?.intimacy_level ?? 3;
  const levelB = bExt.person?.intimacy_level ?? 3;
  const avg = (levelA + levelB) / 2;
  return Math.min(1.0, 0.2 + (avg - 1) * 0.2);
}

/**
 * SCS (Shortest Common Superstring) 기반 가중치.
 * P0: 경로 유사도로 근사. 공통 경로 접두사 길이 기반.
 */
function computeSCSWeight(a: KnowledgeNode, b: KnowledgeNode): number {
  const partsA = a.path.split('/');
  const partsB = b.path.split('/');
  let commonLen = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++)
    if (partsA[i] === partsB[i]) commonLen++;
    else break;

  const maxLen = Math.max(partsA.length, partsB.length);
  if (maxLen === 0) return 1.0;
  return Math.min(1.0, commonLen / maxLen);
}

/** 파일 경로 깊이 계산 */
function getPathDepth(filePath: string): number {
  return filePath.split('/').length;
}

/** 두 경로의 LCS(최장 공통 접두사) 깊이 계산 */
function getLCSDepth(pathA: string, pathB: string): number {
  const partsA = pathA.split('/');
  const partsB = pathB.split('/');
  let lcs = 0;
  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++)
    if (partsA[i] === partsB[i]) lcs++;
    else break;

  return lcs;
}

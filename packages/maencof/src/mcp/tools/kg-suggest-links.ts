/**
 * @file kg-suggest-links.ts
 * @description kg_suggest_links 도구 핸들러 — 2단계 연결 추천 (Jaccard 필터 → SA 보강)
 *
 * 알고리즘:
 * 1단계: 전체 노드 대상 태그 Jaccard 유사도로 후보 선별
 * 2단계: SA 엔진으로 간접 연결 노드에 보강 점수 부여
 * 종합: tag_score + sa_bonus → 정렬 → 상위 N개 반환
 */
import { runSpreadingActivation } from '../../core/spreading-activation.js';
import {
  commonTags,
  extractKeywords,
  jaccardSimilarity,
  normalizeTags,
} from '../../core/tag-similarity.js';
import type { NodeId } from '../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../types/graph.js';
import type {
  KgSuggestLinksInput,
  KgSuggestLinksResult,
  LinkSuggestion,
} from '../../types/mcp.js';

/** SA 보강 가중치 — 최종 점수에서 SA의 최대 기여 비율 */
const SA_BONUS_WEIGHT = 0.3;

/**
 * kg_suggest_links 핸들러
 *
 * @param graph - 지식 그래프 (null이면 빈 결과 반환)
 * @param input - 도구 입력
 */
export function handleKgSuggestLinks(
  graph: KnowledgeGraph | null,
  input: KgSuggestLinksInput,
): KgSuggestLinksResult {
  const startTime = Date.now();
  const maxSuggestions = input.max_suggestions ?? 5;
  const minScore = input.min_score ?? 0.2;

  // 그래프가 없거나 비어있으면 빈 결과
  if (!graph || graph.nodes.size === 0) {
    return { suggestions: [], candidates_explored: 0, duration_ms: 0 };
  }

  // ── 입력 분석: 소스 태그 수집 ──
  const sourceTags = collectSourceTags(graph, input);
  if (sourceTags.length === 0) {
    return {
      suggestions: [],
      candidates_explored: 0,
      duration_ms: Date.now() - startTime,
    };
  }

  // 소스 노드 ID (이미 존재하는 문서인 경우)
  const sourceNodeId = input.path ? findNodeByPath(graph, input.path) : null;

  // 이미 직접 연결된 노드 집합 (제외 대상)
  const directlyLinked = new Set<NodeId>();
  if (sourceNodeId) {
    directlyLinked.add(sourceNodeId);
    for (const edge of graph.edges) {
      if (edge.from === sourceNodeId) directlyLinked.add(edge.to);
      if (edge.to === sourceNodeId) directlyLinked.add(edge.from);
    }
  }

  // ── 1단계: Jaccard 필터 ──
  const candidates: Array<{
    node: KnowledgeNode;
    tagScore: number;
  }> = [];

  for (const [nodeId, node] of graph.nodes) {
    if (directlyLinked.has(nodeId)) continue;
    if (node.tags.length === 0) continue;

    const tagScore = jaccardSimilarity(sourceTags, node.tags);
    if (tagScore >= minScore * 0.5) {
      // 절반 임계값으로 넓게 수집 (SA 보강 기회 부여)
      candidates.push({ node, tagScore });
    }
  }

  // ── 2단계: SA 보강 ──
  const saScores = new Map<NodeId, number>();
  if (sourceNodeId) {
    const saResults = runSpreadingActivation(graph, [sourceNodeId], {
      maxHops: 3,
      threshold: 0.05,
      maxActiveNodes: 50,
    });
    for (const result of saResults) {
      if (!directlyLinked.has(result.nodeId)) {
        saScores.set(result.nodeId, result.score);
      }
    }
  } else if (sourceTags.length > 0) {
    // 태그 매칭으로 시드 노드 결정
    const seedIds = findSeedsByTags(graph, sourceTags, 3);
    if (seedIds.length > 0) {
      const saResults = runSpreadingActivation(graph, seedIds, {
        maxHops: 2,
        threshold: 0.05,
        maxActiveNodes: 50,
      });
      for (const result of saResults) {
        saScores.set(result.nodeId, result.score);
      }
    }
  }

  // ── 종합 점수 산출 ──
  const suggestions: LinkSuggestion[] = [];

  for (const { node, tagScore } of candidates) {
    const saScore = saScores.get(node.id) ?? 0;
    const score = tagScore + saScore * SA_BONUS_WEIGHT;

    if (score < minScore) continue;

    const shared = commonTags(sourceTags, node.tags);
    const reason = buildReason(shared, saScore, node.layer);

    suggestions.push({
      target_path: node.path,
      target_title: node.title,
      target_layer: node.layer as unknown as number,
      target_tags: node.tags,
      score: Math.min(score, 1.0),
      reason,
      tag_score: tagScore,
      sa_score: saScore,
    });
  }

  // 점수 내림차순 정렬 + 상위 N개
  suggestions.sort((a, b) => b.score - a.score);
  const topSuggestions = suggestions.slice(0, maxSuggestions);

  return {
    suggestions: topSuggestions,
    candidates_explored: candidates.length,
    duration_ms: Date.now() - startTime,
  };
}

/** 입력에서 소스 태그를 수집한다 */
function collectSourceTags(
  graph: KnowledgeGraph,
  input: KgSuggestLinksInput,
): string[] {
  const tags: string[] = [];

  // 기존 문서의 태그
  if (input.path) {
    const nodeId = findNodeByPath(graph, input.path);
    if (nodeId) {
      const node = graph.nodes.get(nodeId);
      if (node) tags.push(...node.tags);
    }
  }

  // 직접 제공된 태그
  if (input.tags) {
    tags.push(...input.tags);
  }

  // content_hint에서 키워드 추출
  if (input.content_hint) {
    const keywords = extractKeywords(input.content_hint, 10);
    tags.push(...keywords);
  }

  return normalizeTags(tags);
}

/** 경로로 노드 ID를 찾는다 */
function findNodeByPath(graph: KnowledgeGraph, path: string): NodeId | null {
  for (const [nodeId, node] of graph.nodes) {
    if (node.path === path) return nodeId;
  }
  return null;
}

/** 태그 매칭으로 시드 노드를 찾는다 */
function findSeedsByTags(
  graph: KnowledgeGraph,
  tags: string[],
  maxSeeds: number,
): NodeId[] {
  const tagSet = new Set(normalizeTags(tags));
  const scored: Array<{ nodeId: NodeId; overlap: number }> = [];

  for (const [nodeId, node] of graph.nodes) {
    const nodeTags = new Set(normalizeTags(node.tags));
    let overlap = 0;
    for (const t of tagSet) {
      if (nodeTags.has(t)) overlap++;
    }
    if (overlap > 0) scored.push({ nodeId, overlap });
  }

  scored.sort((a, b) => b.overlap - a.overlap);
  return scored.slice(0, maxSeeds).map((s) => s.nodeId);
}

/** reason 문자열을 생성한다 */
function buildReason(
  shared: string[],
  saScore: number,
  layer: unknown,
): string {
  const parts: string[] = [];

  if (shared.length > 0) {
    parts.push(`Common tags: [${shared.join(', ')}]`);
  }

  if (saScore > 0) {
    parts.push(`SA indirect link (boost score: ${saScore.toFixed(2)})`);
  }

  const layerNames: Record<number, string> = {
    1: 'Core Identity',
    2: 'Derived Knowledge',
    3: 'External Reference',
    4: 'Action Memory',
    5: 'Context',
  };
  const layerNum = layer as number;
  if (layerNames[layerNum]) {
    parts.push(`Layer ${layerNum} (${layerNames[layerNum]})`);
  }

  return parts.length > 0
    ? parts.join(' | ')
    : 'Tag similarity-based suggestion';
}

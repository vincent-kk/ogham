/**
 * @file query-engine.ts
 * @description QueryEngine — 쿼리 파싱, 시드 노드 선정, SA 오케스트레이션, 결과 랭킹
 *
 * 온라인 검색 계층: 사전 계산된 가중치 + SA로 실시간 검색 수행.
 * 시간 제약: MCP 도구 호출 컨텍스트에서 100ms 이하 목표.
 */
import { runSpreadingActivation } from '../../core/spreading-activation/index.js';
import type { SpreadingActivationParams } from '../../core/spreading-activation/index.js';
import type { NodeId } from '../../types/common.js';
import { toNodeId } from '../../types/common.js';
import type { ActivationResult, KnowledgeGraph } from '../../types/graph.js';

import { QueryCache } from '../query-cache/index.js';

/** 시드 매칭 유형 */
export type MatchType =
  | 'path-exact'
  | 'title-exact'
  | 'title-word'
  | 'tag-exact'
  | 'tag-prefix';

/** 매칭 품질이 포함된 시드 */
export interface ScoredSeed {
  nodeId: NodeId;
  matchScore: number;
  matchType: MatchType;
}

/** QueryEngine 검색 옵션 */
export interface QueryOptions {
  /** 최대 결과 수 (기본: 10) */
  maxResults?: number;
  /** SA 감쇠 인자 (기본: 0.7) */
  decay?: number;
  /** 발화 임계값 (기본: 0.1) */
  threshold?: number;
  /** 최대 홉 수 (기본: 5) */
  maxHops?: number;
  /** Layer 필터 (미지정 시 전체 Layer) */
  layerFilter?: number[];
  /** 적응형 SA 파라미터 활성화 (기본: true) */
  adaptiveSA?: boolean;
}

/** 검색 결과 */
export interface QueryResult {
  /** 활성화된 노드 목록 (score 내림차순) */
  results: ActivationResult[];
  /** 시드로 사용된 노드 ID 목록. path-exact 시드만 결과에서 제외되며, 키워드/태그 매칭 시드는 results에도 포함될 수 있다. */
  seedIds: NodeId[];
  /** 탐색된 총 노드 수 */
  exploredNodes: number;
  /** 검색 소요 시간 (ms) */
  durationMs: number;
}

/**
 * 노드에 대한 키워드 매칭 품질을 분류한다.
 * InvertedIndex는 title/tag 출처를 구분하지 않으므로, post-lookup으로 node를 재검사한다.
 */
function classifyMatch(
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

function resolvePathSeed(
  graph: KnowledgeGraph,
  seed: string,
  bestScores: Map<NodeId, ScoredSeed>,
): void {
  const nodeId = toNodeId(seed);
  if (graph.nodes.has(nodeId)) {
    const existing = bestScores.get(nodeId);
    if (!existing || existing.matchScore < 1.0) {
      bestScores.set(nodeId, {
        nodeId,
        matchScore: 1.0,
        matchType: 'path-exact',
      });
    }
  }
}

function resolveKeywordSeed(
  graph: KnowledgeGraph,
  seed: string,
  bestScores: Map<NodeId, ScoredSeed>,
): void {
  const candidateIds = new Set<NodeId>();
  const keyword = seed.toLowerCase();

  if (graph.invertedIndex) {
    for (const [term, nodeIds] of graph.invertedIndex) {
      if (term.startsWith(keyword)) {
        for (const id of nodeIds) candidateIds.add(id);
      }
    }
  } else {
    for (const [id, node] of graph.nodes) {
      const titleMatch = node.title.toLowerCase().includes(keyword);
      const tagMatch = node.tags.some((tag) =>
        tag.toLowerCase().includes(keyword),
      );
      if (titleMatch || tagMatch) candidateIds.add(id);
    }
  }

  for (const id of candidateIds) {
    const node = graph.nodes.get(id);
    if (!node) continue;
    const { score, type } = classifyMatch(node, seed);
    const existing = bestScores.get(id);
    if (!existing || existing.matchScore < score) {
      bestScores.set(id, { nodeId: id, matchScore: score, matchType: type });
    }
  }
}

/**
 * 쿼리 문자열에서 시드 노드를 결정한다.
 *
 * 전략:
 * 1. 쿼리가 '.md'로 끝나거나 '/'를 포함하면 파일 경로로 처리 (score=1.0)
 * 2. 그 외: InvertedIndex prefix matching → post-lookup classification
 *
 * @param graph - 지식 그래프
 * @param seeds - 시드 후보 (경로 또는 키워드)
 * @returns 매칭 품질이 포함된 시드 노드 목록
 */
export function resolveSeedNodes(
  graph: KnowledgeGraph,
  seeds: string[],
): ScoredSeed[] {
  const bestScores = new Map<NodeId, ScoredSeed>();

  for (const seed of seeds) {
    if (seed.endsWith('.md') || seed.includes('/')) {
      resolvePathSeed(graph, seed, bestScores);
    } else {
      resolveKeywordSeed(graph, seed, bestScores);
    }
  }

  return Array.from(bestScores.values());
}

/**
 * Layer 필터를 적용하여 결과를 필터링한다.
 */
function applyLayerFilter(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  layerFilter: number[],
): ActivationResult[] {
  if (layerFilter.length === 0) return results;
  return results.filter((r) => {
    const node = graph.nodes.get(r.nodeId);
    return node && (layerFilter as number[]).includes(node.layer as number);
  });
}

/** 모듈 수준 쿼리 캐시 싱글턴 */
const queryCache = new QueryCache();

/** 쿼리 캐시를 무효화한다 (CRUD 도구 호출 시 사용) */
export function invalidateQueryCache(): void {
  queryCache.clear();
}

/**
 * QueryEngine: 쿼리를 실행하여 관련 노드를 반환한다.
 *
 * @param graph - 지식 그래프 (사전 계산된 가중치 포함)
 * @param seeds - 시드 후보 목록 (경로 또는 키워드)
 * @param options - 검색 옵션
 * @returns 검색 결과
 */
export function query(
  graph: KnowledgeGraph,
  seeds: string[],
  options: QueryOptions = {},
): QueryResult {
  const startTime = Date.now();
  const {
    maxResults = 10,
    decay = 0.7,
    threshold = 0.1,
    maxHops = 5,
    layerFilter = [],
  } = options;

  // 캐시 조회
  const cached = queryCache.get(seeds, options, graph.builtAt);
  if (cached) {
    return { ...cached, durationMs: Date.now() - startTime };
  }

  // 시드 노드 결정 (매칭 품질 포함)
  const scoredSeeds = resolveSeedNodes(graph, seeds);
  const seedIds = scoredSeeds.map((s) => s.nodeId);

  let results: ActivationResult[] = [];

  if (scoredSeeds.length > 0) {
    // seedActivations 맵 구축
    const seedActivations = new Map<NodeId, number>();
    for (const s of scoredSeeds) {
      seedActivations.set(s.nodeId, s.matchScore);
    }

    // 적응형 SA 파라미터 (B1)
    let adaptedMaxHops = maxHops;
    let adaptedThreshold = threshold;
    const useAdaptive =
      options.adaptiveSA !== false && options.maxHops === undefined;

    if (useAdaptive && scoredSeeds.length > 0) {
      const maxScore = Math.max(...scoredSeeds.map((s) => s.matchScore));
      const avgScore =
        scoredSeeds.reduce((sum, s) => sum + s.matchScore, 0) /
        scoredSeeds.length;
      const isStrongSignal =
        scoredSeeds.length === 1 &&
        maxScore >= 0.9 &&
        (scoredSeeds[0]!.matchType === 'path-exact' ||
          scoredSeeds[0]!.matchType === 'title-exact');

      if (isStrongSignal) {
        adaptedMaxHops = Math.min(adaptedMaxHops, 2);
        adaptedThreshold = Math.max(adaptedThreshold, 0.05);
      } else if (avgScore >= 0.6) {
        adaptedMaxHops = Math.min(adaptedMaxHops, 3);
      }
    }

    // SA 파라미터
    const saParams: SpreadingActivationParams = {
      threshold: adaptedThreshold,
      maxHops: adaptedMaxHops,
      maxActiveNodes: 100,
      decayOverride: decay,
      seedActivations,
    };

    // 확산 활성화 실행
    results = runSpreadingActivation(graph, seedIds, saParams);
  }

  // Layer 필터 적용
  if (layerFilter.length > 0) {
    results = applyLayerFilter(results, graph, layerFilter);
  }

  // path-exact 시드만 결과에서 제외 (키워드/태그 매칭 시드는 포함)
  const pathExactSeedSet = new Set(
    scoredSeeds
      .filter((s) => s.matchType === 'path-exact')
      .map((s) => s.nodeId),
  );
  const filtered = results
    .filter((r) => !pathExactSeedSet.has(r.nodeId))
    .slice(0, maxResults);

  const result: QueryResult = {
    results: filtered,
    seedIds,
    exploredNodes: results.length,
    durationMs: Date.now() - startTime,
  };

  // 캐시 저장
  queryCache.set(seeds, options, graph.builtAt, result);

  return result;
}

/** QueryEngine 클래스 (기본 옵션 보관) */
export class QueryEngine {
  private readonly defaultOptions: QueryOptions;

  constructor(defaultOptions: QueryOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * 쿼리 실행
   */
  query(
    graph: KnowledgeGraph,
    seeds: string[],
    options?: QueryOptions,
  ): QueryResult {
    return query(graph, seeds, { ...this.defaultOptions, ...options });
  }

  /**
   * 단일 경로로 관련 문서 탐색
   */
  findRelated(
    graph: KnowledgeGraph,
    path: string,
    options?: QueryOptions,
  ): QueryResult {
    return this.query(graph, [path], options);
  }
}

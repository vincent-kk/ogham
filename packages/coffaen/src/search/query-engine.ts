/**
 * @file query-engine.ts
 * @description QueryEngine — 쿼리 파싱, 시드 노드 선정, SA 오케스트레이션, 결과 랭킹
 *
 * 온라인 검색 계층: 사전 계산된 가중치 + SA로 실시간 검색 수행.
 * 시간 제약: MCP 도구 호출 컨텍스트에서 100ms 이하 목표.
 */

import type { NodeId } from '../types/common.js';
import type { KnowledgeGraph, ActivationResult } from '../types/graph.js';
import { runSpreadingActivation } from '../core/spreading-activation.js';
import type { SpreadingActivationParams } from '../core/spreading-activation.js';
import { toNodeId } from '../types/common.js';

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
}

/** 검색 결과 */
export interface QueryResult {
  /** 활성화된 노드 목록 (score 내림차순) */
  results: ActivationResult[];
  /** 시드로 사용된 노드 ID 목록 */
  seedIds: NodeId[];
  /** 탐색된 총 노드 수 */
  exploredNodes: number;
  /** 검색 소요 시간 (ms) */
  durationMs: number;
}

/**
 * 쿼리 문자열에서 시드 노드를 결정한다.
 *
 * 전략:
 * 1. 쿼리가 '.md'로 끝나거나 '/'를 포함하면 파일 경로로 처리
 * 2. 그 외: Frontmatter 태그/제목 매칭으로 노드 탐색
 *
 * @param graph - 지식 그래프
 * @param seeds - 시드 후보 (경로 또는 키워드)
 * @returns 유효한 시드 노드 ID 목록
 */
export function resolveSeedNodes(graph: KnowledgeGraph, seeds: string[]): NodeId[] {
  const resolvedIds = new Set<NodeId>();

  for (const seed of seeds) {
    const isPathQuery = seed.endsWith('.md') || seed.includes('/');

    if (isPathQuery) {
      // 직접 경로 매칭
      const nodeId = toNodeId(seed);
      if (graph.nodes.has(nodeId)) {
        resolvedIds.add(nodeId);
      }
    } else {
      // 태그/제목 키워드 매칭
      const keyword = seed.toLowerCase();
      for (const [id, node] of graph.nodes) {
        const titleMatch = node.title.toLowerCase().includes(keyword);
        const tagMatch = node.tags.some((tag) => tag.toLowerCase().includes(keyword));
        if (titleMatch || tagMatch) {
          resolvedIds.add(id);
        }
      }
    }
  }

  return Array.from(resolvedIds);
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
  const { maxResults = 10, decay = 0.7, threshold = 0.1, maxHops = 5, layerFilter = [] } = options;

  // 시드 노드 결정
  const seedIds = resolveSeedNodes(graph, seeds);

  let results: ActivationResult[] = [];

  if (seedIds.length > 0) {
    // SA 파라미터
    const saParams: SpreadingActivationParams = {
      threshold,
      maxHops,
      maxActiveNodes: 100,
      decayOverride: decay,
    };

    // 확산 활성화 실행
    results = runSpreadingActivation(graph, seedIds, saParams);
  }

  // Layer 필터 적용
  if (layerFilter.length > 0) {
    results = applyLayerFilter(results, graph, layerFilter);
  }

  // 시드 자신은 결과에서 제외하고 상위 maxResults 반환
  const seedSet = new Set(seedIds);
  const filtered = results.filter((r) => !seedSet.has(r.nodeId)).slice(0, maxResults);

  return {
    results: filtered,
    seedIds,
    exploredNodes: results.length,
    durationMs: Date.now() - startTime,
  };
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
  query(graph: KnowledgeGraph, seeds: string[], options?: QueryOptions): QueryResult {
    return query(graph, seeds, { ...this.defaultOptions, ...options });
  }

  /**
   * 단일 경로로 관련 문서 탐색
   */
  findRelated(graph: KnowledgeGraph, path: string, options?: QueryOptions): QueryResult {
    return this.query(graph, [path], options);
  }
}

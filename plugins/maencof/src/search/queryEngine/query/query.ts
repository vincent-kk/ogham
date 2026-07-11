/**
 * @file query.ts
 * @description 쿼리를 실행하여 관련 노드를 반환한다 — 시드 해석 → QGA-SA → 필터/캐싱.
 *
 * 온라인 검색 계층: 사전 계산된 가중치 + SA로 실시간 검색 수행.
 * 시간 제약: MCP 도구 호출 컨텍스트에서 100ms 이하 목표.
 */
import { runAccumulativeActivation } from '../../../core/spreadingActivation/index.js';
import type { NodeId } from '../../../types/common.js';
import type { ActivationResult, KnowledgeGraph } from '../../../types/graph.js';
import { resolveSeedNodes } from '../seeds/resolveSeedNodes.js';
import type { QueryOptions, QueryResult } from '../types/types.js';

import { applyLayerFilter } from './applyLayerFilter.js';
import { applyTimeWindow } from './applyTimeWindow.js';
import { collectQueryTokens } from './collectQueryTokens.js';
import { iterationsFromMaxHops } from './iterationsFromMaxHops.js';
import { sharedQueryCache } from './sharedQueryCache.js';

/**
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
  const { maxResults = 10, maxHops = 5, layerFilter = [] } = options;

  // 캐시 조회
  const cached = sharedQueryCache.get(seeds, options, graph.builtAt);
  if (cached) return { ...cached, durationMs: Date.now() - startTime };

  // 시드 노드 결정 (매칭 품질 포함)
  const scoredSeeds = resolveSeedNodes(graph, seeds);
  const seedIds = scoredSeeds.map((s) => s.nodeId);

  let results: ActivationResult[] = [];

  if (scoredSeeds.length > 0) {
    // QGA-SA: 합산-누적·차수 정규화·lexical 게이트 (반경은 T 반복으로 제어)
    const seedActivations = new Map<NodeId, number>();
    for (const s of scoredSeeds) seedActivations.set(s.nodeId, s.matchScore);

    const tuning = options.tuning;
    results = runAccumulativeActivation(graph, seedIds, {
      iterations: tuning?.iterations ?? iterationsFromMaxHops(maxHops),
      updateThreshold: tuning?.updateThreshold,
      gateFloor: tuning?.gateFloor,
      alphaBase: tuning?.alphaBase,
      queryTokens: collectQueryTokens(seeds),
      seedActivations,
      maxActiveNodes: 100,
    });
  }

  // Layer 필터 적용
  if (layerFilter.length > 0)
    results = applyLayerFilter(results, graph, layerFilter);

  // updated 시간창 필터 (slice 이전 — truncation 전에 적용)
  results = applyTimeWindow(results, graph, options.since, options.until);

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
  sharedQueryCache.set(seeds, options, graph.builtAt, result);

  return result;
}

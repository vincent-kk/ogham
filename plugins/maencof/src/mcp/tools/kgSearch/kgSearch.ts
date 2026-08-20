/**
 * @file kgSearch.ts
 * @description kg_search 도구 핸들러 — SA 기반 관련 문서 검색 + cluster 열거 모드.
 * seed 모드는 쿼리 엔진의 ActivationResult 를 참조 메타(path·title·tags·gist)로 매핑하고
 * collapse 표기(clusterKey/collapsedCount)를 그대로 노출한다. cluster 모드는 SA 없이
 * 해당 clusterKey 전역 멤버를 updated 내림차순으로 연다 — 서고 멤버 병합(archived),
 * since/until 시간창·match 주제 필터(title·tags 부분매칭) 적용,
 * max_results 페이지(기본 50)·offset 시작 위치(기본 0, 내부 캡 200), 항목에 정렬 키
 * updated 포함, 그 외 필터 미적용, score/hops 0.
 */
import {
  CLUSTER_ENUMERATION_DEFAULT_PAGE,
  MAX_CLUSTER_ENUMERATION,
  MAX_EXPANDED_CLUSTERS,
} from '../../../constants/thresholds.js';
import { readVaultFile } from '../../../core/vaultScanner/index.js';
import { query } from '../../../search/queryEngine/index.js';
import type { NodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type {
  KgSearchInput,
  KgSearchResult,
  KgSearchResultItem,
  SeedResolution,
} from '../../../types/mcp.js';
import { toSeedResolution } from '../helpers/toSeedResolution.js';

import { buildClusterExpansions } from './helpers/buildClusterExpansions.js';

/**
 * kg_search 핸들러
 *
 * @param graph - 로드된 지식 그래프 (null이면 미빌드 오류 반환)
 * @param input - 도구 입력 (`seed` 또는 `cluster` 중 정확히 하나)
 * @param vaultRoot - vault 루트 절대 경로 (include_content 본문 읽기에만 사용)
 */
export async function handleKgSearch(
  graph: KnowledgeGraph | null,
  input: KgSearchInput,
  vaultRoot?: string,
): Promise<KgSearchResult | { error: string }> {
  if (!graph)
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };
  if (input.cluster && input.seed && input.seed.length > 0)
    return { error: 'seed and cluster are mutually exclusive.' };
  if (!input.cluster && (!input.seed || input.seed.length === 0))
    return { error: 'Either seed or cluster is required.' };

  const startTime = Date.now();

  let items: KgSearchResultItem[];
  let exploredNodes: number;
  let seedResolution: SeedResolution;
  let clusterMeta: Pick<
    KgSearchResult,
    'cluster' | 'clusterSize' | 'truncated'
  > = {};

  if (input.cluster) {
    const nodeMembers = [...graph.nodes.values()]
      .filter((n) => n.clusterKey === input.cluster)
      .map((n) => ({
        path: n.path,
        title: n.title,
        tags: n.tags,
        updated: n.updated,
        ...(n.gist !== undefined && { gist: n.gist }),
      }));
    const archiveMembers = (
      graph.archiveClusterMembers?.get(input.cluster) ?? []
    ).map((m) => ({
      path: m.path,
      title: m.title,
      tags: m.tags,
      updated: m.updated,
      archived: true,
    }));

    const inWindow = (updated: string): boolean =>
      (input.since === undefined || updated >= input.since) &&
      (input.until === undefined || updated <= input.until);

    const needle = input.match?.toLowerCase();
    const matchesTopic = (m: { title: string; tags: string[] }): boolean =>
      needle === undefined ||
      m.title.toLowerCase().includes(needle) ||
      m.tags.some((t) => t.toLowerCase().includes(needle));

    // 불변식: 필터(시간창·match) → 정렬 → 계수(clusterSize) → 절단(pageLimit) 순서 고정.
    // 절단은 pageLimit 한 곳뿐이고, clusterSize 는 절단 전 필터 통과 총원이다.
    const members = [...nodeMembers, ...archiveMembers]
      .filter((m) => inWindow(m.updated) && matchesTopic(m))
      .sort(
        (a, b) =>
          b.updated.localeCompare(a.updated) || a.path.localeCompare(b.path),
      );
    const clusterSize = members.length;
    const pageLimit = Math.min(
      input.max_results ?? CLUSTER_ENUMERATION_DEFAULT_PAGE,
      MAX_CLUSTER_ENUMERATION,
    );
    const offset = input.offset ?? 0;
    items = members.slice(offset, offset + pageLimit).map((member) => ({
      ...member,
      score: 0,
      hops: 0,
      clusterKey: input.cluster,
    }));
    const truncated = offset + items.length < clusterSize;
    exploredNodes = 0;
    seedResolution = { resolved: {} };
    clusterMeta = {
      cluster: input.cluster,
      clusterSize,
      ...(truncated && { truncated }),
    };
  } else {
    const result = query(graph, input.seed!, {
      maxResults: input.max_results ?? 10,
      decay: input.decay ?? 0.7,
      threshold: input.threshold ?? 0.1,
      maxHops: input.max_hops ?? 5,
      layerFilter: input.layer_filter as number[] | undefined,
      subLayerFilter: input.sub_layer,
      since: input.since,
      until: input.until,
    });

    // R10 — 확장 대상: 결과 순위 상위 MAX_EXPANDED_CLUSTERS 개의 시드 접촉 클러스터
    const cm = result.clusterMatches;
    const expandKeys: string[] = [];
    const representatives = new Map<string, NodeId>();
    if (cm)
      for (const r of result.results) {
        if (r.clusterKey === undefined) continue;
        if (!representatives.has(r.clusterKey))
          representatives.set(r.clusterKey, r.nodeId);
        if (
          r.clusterKey in cm &&
          expandKeys.length < MAX_EXPANDED_CLUSTERS &&
          !expandKeys.includes(r.clusterKey)
        )
          expandKeys.push(r.clusterKey);
      }
    const expansions = cm
      ? buildClusterExpansions(
          graph,
          Object.fromEntries(expandKeys.map((k) => [k, cm[k]!])),
          representatives,
        )
      : undefined;

    items = result.results.map((r) => {
      const node = graph.nodes.get(r.nodeId);
      const expansion =
        r.clusterKey !== undefined ? expansions?.get(r.clusterKey) : undefined;
      return {
        path: String(r.nodeId),
        score: r.score,
        hops: r.hops,
        title: node?.title ?? String(r.nodeId),
        tags: node?.tags ?? [],
        ...(node?.gist !== undefined && { gist: node.gist }),
        ...(input.include_trace === true && { trace: r.path.map(String) }),
        ...(r.clusterKey !== undefined && { clusterKey: r.clusterKey }),
        ...(r.collapsedCount !== undefined && {
          collapsedCount: r.collapsedCount,
        }),
        ...(expansion
          ? {
              expansion: expansion.entries,
              ...(expansion.omitted > 0 && {
                expansionOmitted: expansion.omitted,
              }),
            }
          : r.collapsedMembers !== undefined && {
              collapsedMembers: r.collapsedMembers.map(String),
            }),
      };
    });
    exploredNodes = result.exploredNodes;
    seedResolution = toSeedResolution(result.seedCounts);
  }

  if (input.include_content === true && vaultRoot)
    await Promise.all(
      items.map(async (item) => {
        try {
          item.content = await readVaultFile(vaultRoot, item.path);
        } catch {
          // 파일 부재/읽기 실패 문서는 content 없이 반환한다
        }
      }),
    );

  return {
    results: items,
    durationMs: Date.now() - startTime,
    exploredNodes,
    seedResolution,
    ...clusterMeta,
  };
}

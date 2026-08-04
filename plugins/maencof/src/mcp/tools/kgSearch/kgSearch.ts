/**
 * @file kgSearch.ts
 * @description kg_search 도구 핸들러 — SA 기반 관련 문서 검색.
 * 쿼리 엔진의 ActivationResult 를 참조 메타(path·title·tags·gist)로 매핑한다.
 */
import { readVaultFile } from '../../../core/vaultScanner/index.js';
import { query } from '../../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type {
  KgSearchInput,
  KgSearchResult,
  KgSearchResultItem,
} from '../../../types/mcp.js';

/**
 * kg_search 핸들러
 *
 * @param graph - 로드된 지식 그래프 (null이면 미빌드 오류 반환)
 * @param input - 도구 입력
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

  const startTime = Date.now();

  const result = query(graph, input.seed, {
    maxResults: input.max_results ?? 10,
    decay: input.decay ?? 0.7,
    threshold: input.threshold ?? 0.1,
    maxHops: input.max_hops ?? 5,
    layerFilter: input.layer_filter as number[] | undefined,
    since: input.since,
    until: input.until,
  });

  // Post-SA sub_layer 필터
  let filtered = result.results;
  if (input.sub_layer)
    filtered = result.results.filter((r) => {
      const node = graph.nodes.get(r.nodeId);
      return node?.subLayer === input.sub_layer;
    });

  const items: KgSearchResultItem[] = filtered.map((r) => {
    const node = graph.nodes.get(r.nodeId);
    return {
      path: String(r.nodeId),
      score: r.score,
      hops: r.hops,
      title: node?.title ?? String(r.nodeId),
      tags: node?.tags ?? [],
      ...(node?.gist !== undefined && { gist: node.gist }),
      ...(input.include_trace === true && { trace: r.path.map(String) }),
    };
  });

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
    exploredNodes: result.exploredNodes,
  };
}

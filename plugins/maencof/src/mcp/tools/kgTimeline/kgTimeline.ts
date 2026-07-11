/**
 * @file kgTimeline.ts
 * @description kg_timeline 도구 핸들러 — updated 시간 기준 최신순/기간 내 문서 열거 (시드·SA 미사용, 그래프 노드 직접 스캔).
 */
import { isDateInWindow } from '../../../core/dateFormat/index.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type {
  KgTimelineInput,
  KgTimelineItem,
  KgTimelineResult,
} from '../../../types/mcpKg.js';

/**
 * kg_timeline 핸들러
 *
 * @param graph - 로드된 지식 그래프 (null이면 미빌드 오류 반환)
 * @param input - 도구 입력
 */
export function handleKgTimeline(
  graph: KnowledgeGraph | null,
  input: KgTimelineInput,
): KgTimelineResult | { error: string } {
  if (!graph)
    return {
      error: 'Index not built. Please run /maencof:build first.',
    };

  const limit = input.limit ?? 20;

  const layerSet =
    input.layer_filter && input.layer_filter.length > 0
      ? new Set<number>(input.layer_filter as number[])
      : null;

  const matched = [...graph.nodes.values()].filter(
    (node) =>
      isDateInWindow(node.updated, input.since, input.until) &&
      (!layerSet || layerSet.has(node.layer as number)) &&
      (!input.sub_layer || node.subLayer === input.sub_layer),
  );

  // newest first — byte comparison (플랫폼 무관 결정적; isDateInWindow 와 동일 idiom, ICU/locale 비의존)
  matched.sort((a, b) =>
    a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0,
  );

  const results: KgTimelineItem[] = matched.slice(0, limit).map((node) => ({
    path: node.path,
    title: node.title,
    updated: node.updated,
    created: node.created,
    layer: node.layer,
    gist: node.gist,
  }));

  return { results, totalMatched: matched.length };
}

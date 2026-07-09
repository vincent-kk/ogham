/**
 * @file selectContextCandidates.ts
 * @description 자연어 query 를 시드로 분해하고 SA 후보를 선정한다 (조립 전 단계).
 * 핸들러와 평가 하네스(eval liveContextFn)가 공유하는 단일 경로 —
 * 분해 방식 변경이 하네스 측정 범위를 벗어나지 못하게 한다.
 */
import {
  KG_CONTEXT_SCOPE_PRESETS,
  KgContextScope,
} from '../../../../constants/kgContext.js';
import {
  deriveContextSeeds,
  query,
} from '../../../../search/queryEngine/index.js';
import type {
  ActivationResult,
  KnowledgeGraph,
} from '../../../../types/graph.js';
import type { KgContextInput } from '../../../../types/mcp.js';

export function selectContextCandidates(
  graph: KnowledgeGraph,
  input: Pick<KgContextInput, 'query' | 'layer_filter' | 'sub_layer' | 'scope'>,
): ActivationResult[] {
  const seeds = deriveContextSeeds(input.query);
  const scopePreset =
    KG_CONTEXT_SCOPE_PRESETS[input.scope ?? KgContextScope.BALANCED];

  // 쿼리 실행 — 선별(layer/sub_layer/scope)은 예산 소비 전에 적용
  const queryResult = query(graph, seeds, {
    maxResults: 20,
    decay: 0.7,
    threshold: scopePreset.threshold,
    maxHops: scopePreset.maxHops,
    layerFilter: input.layer_filter as number[] | undefined,
  });

  let candidates = queryResult.results;
  if (input.sub_layer)
    candidates = candidates.filter(
      (r) => graph.nodes.get(r.nodeId)?.subLayer === input.sub_layer,
    );

  return candidates;
}

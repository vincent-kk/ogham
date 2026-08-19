/**
 * @file selectContextCandidates.ts
 * @description 자연어 query 를 시드로 분해해 SA 후보를 선정하고, query 파생 단어별
 * 매칭 계수(2-gram phrase 파생 제외)를 함께 돌려준다 (조립 전 단계).
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

/** 후보 선정 결과 — SA 후보와 query 파생 단어별 매칭 계수 (2-gram phrase 파생 제외) */
export interface ContextCandidateSelection {
  candidates: ActivationResult[];
  wordSeedCounts: Record<string, number>;
}

export function selectContextCandidates(
  graph: KnowledgeGraph,
  input: Pick<
    KgContextInput,
    'query' | 'layer_filter' | 'sub_layer' | 'scope' | 'since' | 'until'
  >,
): ContextCandidateSelection {
  const seeds = deriveContextSeeds(input.query);
  const scopePreset =
    KG_CONTEXT_SCOPE_PRESETS[input.scope ?? KgContextScope.BALANCED];

  // 쿼리 실행 — 선별(layer/sub_layer/scope)은 예산 소비 전에 적용.
  // sub_layer 는 쿼리 엔진 subLayerFilter pre-filter 다 (절단 후 필터 금지).
  const queryResult = query(graph, seeds, {
    maxResults: 20,
    decay: 0.7,
    threshold: scopePreset.threshold,
    maxHops: scopePreset.maxHops,
    layerFilter: input.layer_filter as number[] | undefined,
    subLayerFilter: input.sub_layer,
    since: input.since,
    until: input.until,
  });

  const candidates = queryResult.results;

  const wordSeedCounts = Object.fromEntries(
    Object.entries(queryResult.seedCounts).filter(
      ([seed]) => !seed.includes(' '),
    ),
  );

  return { candidates, wordSeedCounts };
}

/**
 * @file liveContextFn.ts
 * @description 라이브 kg_context 전 파이프라인(질의 분해 → query → 조립)의 컨텍스트 함수.
 * 핸들러와 동일한 selectContextCandidates + assembleContext 를 경유해
 * 자연어 분해·예산 절단 효과까지 측정 범위에 포함한다.
 */
import { selectContextCandidates } from '../../mcp/tools/kgContext/index.js';
import { assembleContext } from '../../search/contextAssembler/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import type { ContextFn } from './engineMetrics.js';
import { CONTEXT_TOKEN_BUDGET } from './evalConstants.js';

export function liveContextFn(
  graph: KnowledgeGraph,
  tokenBudget = CONTEXT_TOKEN_BUDGET,
): ContextFn {
  return (rawQuery) => {
    const candidates = selectContextCandidates(graph, { query: rawQuery });
    const assembled = assembleContext(candidates, graph, { tokenBudget });
    return assembled.items.map((item) => item.path);
  };
}

/**
 * @file liveSearchFn.ts
 * @description 라이브 QGA-SA 엔진의 검색 함수 (src query() 경유).
 */
import type { QueryOptions } from '../../search/queryEngine/index.js';
import { query } from '../../search/queryEngine/index.js';
import type { KnowledgeGraph } from '../../types/graph.js';

import type { SearchFn } from './engineMetrics.js';
import { LIVE_DEFAULTS } from './evalConstants.js';

export function liveSearchFn(
  graph: KnowledgeGraph,
  options: QueryOptions = LIVE_DEFAULTS,
): SearchFn {
  return (seeds) => {
    const { results } = query(graph, seeds, options);
    return results.map(
      (r) => graph.nodes.get(r.nodeId)?.path ?? String(r.nodeId),
    );
  };
}

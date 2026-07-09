/**
 * @file resolvePathSeed.ts
 * @description 경로 시드를 해석한다 — 정확 노드(score 1.0, path-exact) 또는 폴더 prefix 폴백.
 */
import {
  PATH_PREFIX_MATCH_SCORE,
  PATH_PREFIX_SEED_CAP,
} from '../../../constants/queryEngine.js';
import type { NodeId } from '../../../types/common.js';
import { toNodeId } from '../../../types/common.js';
import type { KnowledgeGraph } from '../../../types/graph.js';
import type { ScoredSeed } from '../types/types.js';

import { capSeedsByPagerank } from './capSeedsByPagerank.js';

export function resolvePathSeed(
  graph: KnowledgeGraph,
  seed: string,
  bestScores: Map<NodeId, ScoredSeed>,
): void {
  const nodeId = toNodeId(seed);
  if (graph.nodes.has(nodeId)) {
    const existing = bestScores.get(nodeId);
    if (!existing || existing.matchScore < 1.0)
      bestScores.set(nodeId, {
        nodeId,
        matchScore: 1.0,
        matchType: 'path-exact',
      });

    return;
  }

  // 정확 노드 부재 → 폴더 prefix 폴백: `seed/` 경계로 시작하는 노드를 폴더 멤버 시드로 채택.
  // pagerank 상위 PATH_PREFIX_SEED_CAP 개로 상한(대형 폴더 클리크 시드 폭발 차단).
  // path-exact 가 아닌 타입으로 분류 → 폴더 멤버가 결과에서 제외되지 않고 노출된다.
  const prefix = seed.endsWith('/') ? seed : `${seed}/`;
  const memberIds: NodeId[] = [];
  for (const [id, node] of graph.nodes)
    if (node.path.startsWith(prefix)) memberIds.push(id);

  if (memberIds.length === 0) return;

  for (const id of capSeedsByPagerank(graph, memberIds, PATH_PREFIX_SEED_CAP)) {
    const existing = bestScores.get(id);
    if (!existing || existing.matchScore < PATH_PREFIX_MATCH_SCORE)
      bestScores.set(id, {
        nodeId: id,
        matchScore: PATH_PREFIX_MATCH_SCORE,
        matchType: 'tag-exact',
      });
  }
}

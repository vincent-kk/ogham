/**
 * @file deriveSiblingEdges.ts
 * @description 디렉토리 멤버십에서 SIBLING 엣지를 파생한다 (물질화 대체).
 */
import type { NodeId } from '../../../types/common.js';
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';
import { buildDirectoryMap } from '../builders/index.js';

/**
 * graph.nodes 의 디렉토리 멤버십에서 SIBLING 엣지를 파생하는 generator.
 *
 * SIBLING 은 node.path 가 이미 보유한 폴더 멤버십의 O(k²) 전개이므로 디스크에
 * 저장하지 않고 런타임 맵 구성 시점에 합성한다. 가중치는 물질화 시절의
 * Wu-Palmer 값과 동치인 폴더 상수 (d-1)/d — 동일 디렉토리 쌍은 depth 가 같고
 * LCS 깊이가 d-1 이므로 쌍별 계산이 필요 없다.
 */
export function* deriveSiblingEdges(
  nodeMap: Map<NodeId, KnowledgeNode>,
): Generator<KnowledgeEdge> {
  const dirMap = buildDirectoryMap(Array.from(nodeMap.values()));
  for (const [, members] of dirMap) {
    if (members.length < 2) continue;
    const first = nodeMap.get(members[0]);
    if (!first) continue;
    const depth = first.path.split('/').length;
    const weight = (depth - 1) / depth;
    for (let i = 0; i < members.length; i++)
      for (let j = i + 1; j < members.length; j++) {
        yield { from: members[i], to: members[j], type: 'SIBLING', weight };
        yield { from: members[j], to: members[i], type: 'SIBLING', weight };
      }
  }
}

/**
 * 실제 엣지 뒤에 파생 SIBLING 을 잇는 스트림. 런타임 맵 빌더에 그대로 공급한다 —
 * 실엣지가 먼저 소비돼야 LINK 등 상위 multiplier 타입이 pair 맵 선점을 유지하고,
 * 하한 도입 이전 인덱스의 잔존 SIBLING 엣지와도 중복 없이 병합된다.
 */
export function* edgesWithDerivedSiblings(
  graph: Pick<KnowledgeGraph, 'nodes' | 'edges'>,
): Generator<KnowledgeEdge> {
  yield* graph.edges;
  yield* deriveSiblingEdges(graph.nodes);
}

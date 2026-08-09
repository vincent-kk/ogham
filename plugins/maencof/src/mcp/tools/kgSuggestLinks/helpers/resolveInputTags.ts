/**
 * @file resolveInputTags.ts
 * @description 입력 태그를 볼트 태그 어휘와 대조해 seedResolution 메타를 만든다
 * (소문자 비교, resolved 값은 해당 태그 보유 문서 수).
 */
import type { KnowledgeGraph } from '../../../../types/graph.js';
import type { SeedResolution } from '../../../../types/mcp.js';
import { toSeedResolution } from '../../helpers/toSeedResolution.js';

/**
 * @param graph - 지식 그래프
 * @param tags - 호출자가 명시적으로 제공한 태그 목록 (원문 보존, 중복 제거)
 * @returns 태그별 보유 문서 수(resolved)와 어휘 부재 태그(unresolved)
 */
export function resolveInputTags(
  graph: KnowledgeGraph,
  tags: string[],
): SeedResolution {
  const docCounts = new Map<string, number>();
  for (const [, node] of graph.nodes)
    for (const tag of node.tags) {
      const key = tag.toLowerCase();
      docCounts.set(key, (docCounts.get(key) ?? 0) + 1);
    }

  // Object.create(null): 'constructor' 같은 프로토타입 이름 태그의 in 오염 차단
  const counts: Record<string, number> = Object.create(null);
  for (const tag of tags)
    if (!(tag in counts)) counts[tag] = docCounts.get(tag.toLowerCase()) ?? 0;

  return toSeedResolution(counts);
}

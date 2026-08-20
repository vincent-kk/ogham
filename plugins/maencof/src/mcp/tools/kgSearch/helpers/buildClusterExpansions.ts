/**
 * @file buildClusterExpansions.ts
 * @description R10 — 시드 접촉 클러스터의 자동 확장. touched 키 전체 멤버를
 * graph.nodes 1패스로 모으고, 키별로 매칭 멤버 우선 → updated 내림차순 → path
 * 사전순 정렬 후 CLUSTER_EXPANSION_CAP 으로 자른다. results 랭킹에는 관여하지 않는다.
 */
import { CLUSTER_EXPANSION_CAP } from '../../../../constants/thresholds.js';
import type { NodeId } from '../../../../types/common.js';
import type { KnowledgeGraph, KnowledgeNode } from '../../../../types/graph.js';
import type { ClusterExpansionEntry } from '../../../../types/mcpKg.js';

/** 키별 확장 결과 — 절단 목록과 남은 수 */
export interface ClusterExpansion {
  entries: ClusterExpansionEntry[];
  omitted: number;
}

/**
 * @param graph - 지식 그래프
 * @param clusterMatches - 확장 대상 클러스터 → 매칭 멤버 id (상한 선별은 호출자 몫)
 * @param representatives - clusterKey → 그 결과 항목의 대표 nodeId (목록에서 제외)
 * @returns clusterKey → 확장 목록 (대표 제외, matched-first → updated desc → path asc, 상한 적용). 목록이 빈 키는 담지 않는다.
 */
export function buildClusterExpansions(
  graph: KnowledgeGraph,
  clusterMatches: Record<string, NodeId[]>,
  representatives: ReadonlyMap<string, NodeId>,
): Map<string, ClusterExpansion> {
  const membersByKey = new Map<string, KnowledgeNode[]>();
  for (const node of graph.nodes.values()) {
    const key = node.clusterKey;
    if (!key || !(key in clusterMatches)) continue;
    if (representatives.get(key) === node.id) continue;
    const list = membersByKey.get(key);
    if (list) list.push(node);
    else membersByKey.set(key, [node]);
  }

  const expansions = new Map<string, ClusterExpansion>();
  for (const [key, members] of membersByKey) {
    const matched = new Set(clusterMatches[key]);
    members.sort(
      (a, b) =>
        Number(matched.has(b.id)) - Number(matched.has(a.id)) ||
        b.updated.localeCompare(a.updated) ||
        a.path.localeCompare(b.path),
    );
    expansions.set(key, {
      entries: members.slice(0, CLUSTER_EXPANSION_CAP).map((n) => ({
        path: n.path,
        title: n.title,
        updated: n.updated,
        ...(matched.has(n.id) && { matched: true }),
      })),
      omitted: Math.max(0, members.length - CLUSTER_EXPANSION_CAP),
    });
  }
  return expansions;
}

/**
 * @file collapseClusters.ts
 * @description 같은 clusterKey 결과를 대표 1건으로 접는다 — 같은 스레드 N건은 독립
 * 증거가 아니라 같은 사건의 반복 관측이다. 그룹 점수는 활성 멤버 max 승계(sum 은 수
 * 프리미엄을 부활시킨다), 대표는 활성 필터를 만족하는 그래프 전역 멤버 중 updated
 * 최신(증류본 자동 승계 — 결과 밖 멤버도 후보), 접힌 수는 collapsedCount 로 표기한다.
 * clusterKey 없는 노드는 개별 경쟁을 유지한다. query() 의 절단(slice) 직전 전용.
 */
import type { NodeId } from '../../../types/common.js';
import type {
  ActivationResult,
  KnowledgeGraph,
  KnowledgeNode,
} from '../../../types/graph.js';

/** 대표 비교용 날짜 — updated 가 YYYY-MM-DD 형식이 아니면 mtime 파생 날짜로 폴백 */
function repDate(node: KnowledgeNode): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(node.updated)
    ? node.updated
    : new Date(node.mtime).toISOString().slice(0, 10);
}

/** 대표 우선순위 — updated 최신 → 활성 멤버 우선 → nodeId 사전순. b 가 우선이면 양수 */
function preferOver(
  a: KnowledgeNode,
  b: KnowledgeNode,
  activeIds: Set<NodeId>,
): number {
  const byDate = repDate(a).localeCompare(repDate(b));
  if (byDate !== 0) return byDate;
  const byActive =
    Number(activeIds.has(a.id)) - Number(activeIds.has(b.id));
  if (byActive !== 0) return byActive;
  return a.id < b.id ? 1 : -1;
}

export function collapseClusters(
  results: ActivationResult[],
  graph: KnowledgeGraph,
  isEligible: (node: KnowledgeNode) => boolean,
): ActivationResult[] {
  const groups = new Map<string, ActivationResult[]>();
  const order: Array<ActivationResult | string> = [];
  for (const r of results) {
    const key = graph.nodes.get(r.nodeId)?.clusterKey;
    if (!key) {
      order.push(r);
      continue;
    }
    const members = groups.get(key);
    if (members) members.push(r);
    else {
      groups.set(key, [r]);
      order.push(key);
    }
  }
  if (groups.size === 0) return results;

  // 결과에 등장한 클러스터의 전역 대표 후보 — graph.nodes 1패스 (인덱스 없음: 유지 경로
  // 3곳 동기화 비용이 1패스 비용을 넘는다)
  const candidates = new Map<string, KnowledgeNode[]>();
  for (const node of graph.nodes.values()) {
    const key = node.clusterKey;
    if (!key || !groups.has(key) || !isEligible(node)) continue;
    const list = candidates.get(key);
    if (list) list.push(node);
    else candidates.set(key, [node]);
  }

  const collapsed: ActivationResult[] = [];
  for (const entry of order) {
    if (typeof entry !== 'string') {
      collapsed.push(entry);
      continue;
    }
    const active = groups.get(entry)!;
    const activeIds = new Set(active.map((m) => m.nodeId));
    let representative: KnowledgeNode | undefined;
    for (const node of candidates.get(entry) ?? [])
      if (!representative || preferOver(representative, node, activeIds) < 0)
        representative = node;

    const maxScore = Math.max(...active.map((m) => m.score));
    const minHops = Math.min(...active.map((m) => m.hops));
    const repActive = representative
      ? active.find((m) => m.nodeId === representative!.id)
      : undefined;
    const base: ActivationResult = repActive
      ? { ...repActive, score: maxScore }
      : {
          nodeId: representative?.id ?? active[0]!.nodeId,
          score: maxScore,
          hops: minHops,
          path: [],
        };
    const collapsedCount = repActive ? active.length - 1 : active.length;
    collapsed.push({
      ...base,
      clusterKey: entry,
      ...(collapsedCount > 0 && { collapsedCount }),
    });
  }

  return collapsed.sort(
    (a, b) =>
      b.score - a.score ||
      a.hops - b.hops ||
      (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0),
  );
}

/**
 * @file topo-leveler.ts
 * @description Kahn topological level assignment + cycle breaking + group chunking
 */

import type {
  BatchEdge,
  BatchGroup,
  BatchCycleBroken,
  BatchItemRef,
} from '../../types/manifest.js';
import type { CollectedNode } from './dependency-collector.js';

export interface LevelingResult {
  groups: BatchGroup[];
  cycles_broken: BatchCycleBroken[];
  unresolved: string[];
}

export function assignLevels(
  nodes: CollectedNode[],
  edges: BatchEdge[],
  rationaleFor: (node: CollectedNode) => string,
  maxParallel?: number,
): LevelingResult {
  const remainingEdges = [...edges];
  const cyclesBroken: BatchCycleBroken[] = [];

  let levelByNode = runKahn(nodes, remainingEdges);

  while (hasUnassigned(nodes, levelByNode)) {
    const cycle = findCycle(nodes, remainingEdges, levelByNode);
    if (cycle.length === 0) break;

    const removed = removeWeakestEdge(cycle, remainingEdges);
    if (!removed) break;
    cyclesBroken.push({
      nodes: cycle,
      resolution: `removed edge ${removed.from} -> ${removed.to} (source: ${removed.source}, weight: ${removed.weight})`,
    });
    levelByNode = runKahn(nodes, remainingEdges);
  }

  const unresolved = nodes
    .filter((n) => !levelByNode.has(n.id))
    .map((n) => n.id);

  const groups = buildGroups(nodes, levelByNode, rationaleFor, maxParallel);

  return { groups, cycles_broken: cyclesBroken, unresolved };
}

// --- Kahn ---

function runKahn(
  nodes: CollectedNode[],
  edges: BatchEdge[],
): Map<string, number> {
  const inDegree = new Map<string, number>();
  for (const n of nodes) inDegree.set(n.id, 0);
  for (const e of edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  const levelByNode = new Map<string, number>();
  let current = nodes
    .filter((n) => (inDegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  let level = 0;

  while (current.length > 0) {
    for (const id of current) levelByNode.set(id, level);

    const next: string[] = [];
    for (const id of current) {
      for (const e of edges) {
        if (e.from !== id) continue;
        const d = (inDegree.get(e.to) ?? 0) - 1;
        inDegree.set(e.to, d);
        if (d === 0 && !levelByNode.has(e.to)) next.push(e.to);
      }
    }
    level++;
    current = next;
  }

  return levelByNode;
}

function hasUnassigned(
  nodes: CollectedNode[],
  levelByNode: Map<string, number>,
): boolean {
  return nodes.some((n) => !levelByNode.has(n.id));
}

// --- Cycle detection ---

function findCycle(
  nodes: CollectedNode[],
  edges: BatchEdge[],
  levelByNode: Map<string, number>,
): string[] {
  const candidates = nodes.filter((n) => !levelByNode.has(n.id)).map((n) => n.id);
  const candSet = new Set(candidates);
  const outEdges = new Map<string, string[]>();
  for (const id of candidates) outEdges.set(id, []);
  for (const e of edges) {
    if (candSet.has(e.from) && candSet.has(e.to)) {
      outEdges.get(e.from)!.push(e.to);
    }
  }

  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  const sortedStart = [...candidates].sort();
  for (const start of sortedStart) {
    if (visited.has(start)) continue;
    const cycle = dfsCycle(start, outEdges, visited, stack, onStack);
    if (cycle.length > 0) return cycle;
  }
  return [];
}

function dfsCycle(
  start: string,
  outEdges: Map<string, string[]>,
  visited: Set<string>,
  stack: string[],
  onStack: Set<string>,
): string[] {
  stack.push(start);
  onStack.add(start);
  visited.add(start);
  const neighbors = [...(outEdges.get(start) ?? [])].sort();
  for (const nb of neighbors) {
    if (onStack.has(nb)) {
      const idx = stack.indexOf(nb);
      return stack.slice(idx);
    }
    if (!visited.has(nb)) {
      const found = dfsCycle(nb, outEdges, visited, stack, onStack);
      if (found.length > 0) return found;
    }
  }
  stack.pop();
  onStack.delete(start);
  return [];
}

function removeWeakestEdge(
  cycle: string[],
  edges: BatchEdge[],
): BatchEdge | null {
  const cycleEdges: BatchEdge[] = [];
  for (let i = 0; i < cycle.length; i++) {
    const from = cycle[i]!;
    const to = cycle[(i + 1) % cycle.length]!;
    const idx = edges.findIndex((e) => e.from === from && e.to === to);
    if (idx >= 0) cycleEdges.push(edges[idx]!);
  }
  if (cycleEdges.length === 0) return null;

  cycleEdges.sort((a, b) => {
    if (a.weight !== b.weight) return a.weight - b.weight;
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    return a.to < b.to ? -1 : 1;
  });
  const weakest = cycleEdges[0]!;
  const idx = edges.findIndex(
    (e) => e.from === weakest.from && e.to === weakest.to && e.source === weakest.source,
  );
  if (idx >= 0) edges.splice(idx, 1);
  return weakest;
}

// --- Group building ---

function buildGroups(
  nodes: CollectedNode[],
  levelByNode: Map<string, number>,
  rationaleFor: (node: CollectedNode) => string,
  maxParallel?: number,
): BatchGroup[] {
  const byLevel = new Map<number, CollectedNode[]>();
  for (const n of nodes) {
    const lvl = levelByNode.get(n.id);
    if (lvl === undefined) continue;
    const bucket = byLevel.get(lvl) ?? [];
    bucket.push(n);
    byLevel.set(lvl, bucket);
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const groups: BatchGroup[] = [];
  let groupCounter = 1;
  const lastGroupIdAtLevel = new Map<number, string[]>();

  for (const level of levels) {
    const items = byLevel.get(level)!.sort((a, b) => (a.id < b.id ? -1 : 1));
    const chunks = chunkItems(items, maxParallel);
    const groupIdsAtThisLevel: string[] = [];

    for (const chunk of chunks) {
      const group_id = `G${groupCounter++}`;
      const refs: BatchItemRef[] = chunk.map((n) => ({
        id: n.id,
        kind: n.kind,
        issue_ref: n.issue_ref,
        rationale: rationaleFor(n),
      }));
      const depends_on_groups = level === 0 ? [] : (lastGroupIdAtLevel.get(level - 1) ?? []);
      groups.push({
        group_id,
        level,
        can_parallel: chunk.length > 1,
        items: refs,
        depends_on_groups,
      });
      groupIdsAtThisLevel.push(group_id);
    }
    lastGroupIdAtLevel.set(level, groupIdsAtThisLevel);
  }

  return groups;
}

function chunkItems<T>(items: T[], maxParallel?: number): T[][] {
  if (!maxParallel || maxParallel <= 0 || items.length <= maxParallel) {
    return [items];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += maxParallel) {
    chunks.push(items.slice(i, i + maxParallel));
  }
  return chunks;
}

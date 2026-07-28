import type { CanonicalDirectedGraph } from './types.js';

export function findStronglyConnectedComponents(
  graph: CanonicalDirectedGraph,
): string[][] {
  const visited = new Set<string>();
  const finished: string[] = [];
  for (const start of graph.nodes) {
    if (visited.has(start)) continue;
    const stack = [{ node: start, expanded: false }];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.expanded) {
        finished.push(current.node);
        continue;
      }
      if (visited.has(current.node)) continue;
      visited.add(current.node);
      stack.push({ node: current.node, expanded: true });
      const neighbors = [...(graph.adjacency.get(current.node) ?? [])]
        .sort()
        .reverse();
      for (const neighbor of neighbors)
        if (!visited.has(neighbor))
          stack.push({ node: neighbor, expanded: false });
    }
  }

  const assigned = new Set<string>();
  const components: string[][] = [];
  for (const start of finished.reverse()) {
    if (assigned.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    assigned.add(start);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      const neighbors = [...(graph.reverse.get(current) ?? [])]
        .sort()
        .reverse();
      for (const neighbor of neighbors)
        if (!assigned.has(neighbor)) {
          assigned.add(neighbor);
          stack.push(neighbor);
        }
    }
    components.push(component.sort());
  }
  return components;
}

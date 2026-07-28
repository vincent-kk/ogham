export function findDirectedCycleRoute(
  component: readonly string[],
  adjacency: ReadonlyMap<string, ReadonlySet<string>>,
): string[] | null {
  const members = new Set(component);
  const start = [...component].sort()[0];
  if (!start) return null;

  for (const neighbor of [...(adjacency.get(start) ?? [])].sort()) {
    const queue: string[][] = [[neighbor]];
    const visited = new Set([start, neighbor]);
    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1]!;
      for (const next of [...(adjacency.get(current) ?? [])].sort()) {
        if (next === start) return [start, ...path, start];
        if (!members.has(next) || visited.has(next)) continue;
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

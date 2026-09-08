/**
 * Breadth-first closure of a seed set under a neighbour relation.
 *
 * @param {Iterable<string>} seeds Names the closure starts from; always included.
 * @param {(name: string) => Iterable<string>} neighbours Names reached in one step from a name.
 * @returns {Set<string>} Every name reachable from a seed, seeds included.
 */
export function expandClosure(seeds, neighbours) {
  const reached = new Set(seeds);
  const queue = [...reached];
  while (queue.length > 0)
    for (const next of neighbours(queue.shift()))
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
  return reached;
}

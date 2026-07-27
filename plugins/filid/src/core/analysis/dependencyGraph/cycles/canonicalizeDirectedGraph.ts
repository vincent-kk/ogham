import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';

import { canonicalizeNodePaths } from '../builders/canonicalizeNodePaths.js';

import type { CanonicalDirectedGraph, DirectedPair } from './types.js';

export function canonicalizeDirectedGraph(
  nodePaths: readonly string[],
  edges: readonly DirectedPair[],
): CanonicalDirectedGraph {
  const nodes = canonicalizeNodePaths(nodePaths);
  const canonicalByIdentity = new Map(
    nodes.map((node) => [pathForCompare(node), node]),
  );
  const adjacency = new Map(nodes.map((node) => [node, new Set<string>()]));
  const reverse = new Map(nodes.map((node) => [node, new Set<string>()]));

  for (const edge of edges) {
    const from = canonicalByIdentity.get(pathForCompare(edge.from));
    const to = canonicalByIdentity.get(pathForCompare(edge.to));
    if (!from || !to || from === to) continue;
    adjacency.get(from)!.add(to);
    reverse.get(to)!.add(from);
  }

  return { nodes, adjacency, reverse };
}

export interface DirectedPair {
  from: string;
  to: string;
}

export interface CanonicalDirectedGraph {
  nodes: string[];
  adjacency: Map<string, Set<string>>;
  reverse: Map<string, Set<string>>;
}

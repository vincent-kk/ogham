export const CACHE_FILES = {
  /** Legacy single-file graph cache. Kept for one-shot migration on loadGraph. */
  INDEX: 'index.json',
  /** Sharded: serialized KnowledgeNode[]. */
  NODES: 'nodes.json',
  /** Sharded: serialized KnowledgeEdge[]. */
  EDGES: 'edges.json',
  /** Sharded: serialized ArchiveClusterMember[] — optional; absent in pre-0.14 caches. */
  ARCHIVE_MEMBERS: 'archive-members.json',
  /** Sharded: cross-file commit marker (builtAt/nodeCount/edgeCount/schemaVersion). */
  GRAPH_META: 'graph-meta.json',
  WEIGHTS: 'weights.json',
  SNAPSHOT: 'snapshot.json',
  COMMUNITIES: 'communities.json',
  STALE_NODES: 'stale-nodes.json',
} as const;

import { toNodeId } from "@ogham/maencof";
import type {
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from "@ogham/maencof";

/**
 * Build an L2 target with allowed and restricted neighbors in every relationship.
 * @returns An independent graph with real maencof navigation inputs and no disk effects.
 */
export function createNavigateGraph(): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [
    { path: "02_Derived/target.md", title: "Target", layer: 2 as const },
    { path: "02_Derived/allowed.md", title: "Allowed", layer: 2 as const },
    {
      path: "02_Derived/restricted.md",
      title: "Restricted title",
      layer: 1 as const,
    },
  ].map((node) => ({
    ...node,
    id: toNodeId(node.path),
    tags: [],
    created: "2026-01-01",
    updated: "2026-01-01",
    mtime: 0,
    accessed_count: 0,
  }));
  const target = nodes[0];
  const edges: KnowledgeEdge[] = nodes.slice(1).flatMap((neighbor) =>
    (["LINK", "PARENT_OF", "CROSS_LAYER", "DOMAIN"] as const).flatMap(
      (type) => [
        { from: target.id, to: neighbor.id, type, weight: 1 },
        { from: neighbor.id, to: target.id, type, weight: 1 },
      ],
    ),
  );
  edges.push({ from: nodes[1].id, to: nodes[2].id, type: "LINK", weight: 1 });
  for (const node of nodes)
    node.outboundLinks = edges
      .filter((edge) => edge.type === "LINK" && edge.from === node.id)
      .map((edge) => edge.to);
  target.outboundLinks?.push("02_Derived/missing.md");
  return {
    nodes: new Map(nodes.map((node) => [node.id, node])),
    edges,
    builtAt: "2026-01-01T00:00:00Z",
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

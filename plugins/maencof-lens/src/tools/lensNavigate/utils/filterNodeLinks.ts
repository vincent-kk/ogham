import { toNodeId } from "@ogham/maencof";
import type { KnowledgeGraph, KnowledgeNode } from "@ogham/maencof";

/**
 * Copy a response node and remove links to known restricted documents.
 * @param node Navigation node whose cached object must remain unchanged.
 * @param graph Graph used to resolve link layers; missing targets stay visible.
 * @param effectiveLayers Vault ceiling already resolved by the layer guard.
 * @returns A node copy retaining allowed and unknown-layer links without disk effects.
 */
export function filterNodeLinks(
  node: KnowledgeNode,
  graph: KnowledgeGraph | null,
  effectiveLayers: number[],
): KnowledgeNode {
  const copy = { ...node };
  if (copy.outboundLinks)
    copy.outboundLinks = copy.outboundLinks.filter((path) => {
      const layer = graph?.nodes.get(toNodeId(path))?.layer;
      return layer === undefined || effectiveLayers.includes(layer);
    });
  return copy;
}

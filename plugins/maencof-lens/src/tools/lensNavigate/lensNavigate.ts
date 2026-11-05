import { handleKgNavigate } from "@ogham/maencof";
import type { KnowledgeGraph } from "@ogham/maencof";

import { computeEffectiveLayers } from "../../filter/layerGuard/index.js";

import { filterNodeLinks } from "./utils/filterNodeLinks.js";

/** Navigation request scoped to a configured vault and its layer ceiling. */
export interface LensNavigateInput {
  /** Registered vault name; routing supplies the default when omitted. */
  vault?: string;
  /** Vault-relative document path used by maencof to identify the target node. */
  path: string;
  /** Include incoming links; maencof enables them when omitted. */
  include_inbound?: boolean;
  /** Include outgoing links; maencof enables them when omitted. */
  include_outbound?: boolean;
  /** Include parent, children, and siblings; enabled when omitted. */
  include_hierarchy?: boolean;
}

/**
 * Delegate graph navigation and contain document identities within the vault ceiling.
 * @param graph Loaded vault graph, or null when its index is unavailable.
 * @param input Target document and optional relationship selectors.
 * @param vaultLayers Configured layer ceiling, interpreted by the shared layer guard.
 * @returns A filtered copy or an index/restricted-layer error without document identities.
 * Does not mutate the graph or write to the vault.
 */
export async function handleLensNavigate(
  graph: KnowledgeGraph | null,
  input: LensNavigateInput,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(vaultLayers, undefined);

  const result = await handleKgNavigate(graph, {
    path: input.path,
    include_inbound: input.include_inbound,
    include_outbound: input.include_outbound,
    include_hierarchy: input.include_hierarchy,
  });

  if ("error" in result)
    return {
      error: "Vault index not available. Run kg_build in a maencof session.",
    };

  if (
    result.node.layer !== undefined &&
    !effectiveLayers.includes(result.node.layer)
  )
    return {
      error: `Document is in a restricted layer (L${result.node.layer})`,
    };

  const output = { ...result } as Record<string, unknown>;
  output.node = filterNodeLinks(result.node, graph, effectiveLayers);
  for (const key of [
    "inbound",
    "outbound",
    "children",
    "siblings",
    "crossLayer",
    "domain",
  ] as const) {
    const nodes = result[key];
    if (Array.isArray(nodes))
      output[key] = nodes
        .filter(
          (node) =>
            node.layer === undefined || effectiveLayers.includes(node.layer),
        )
        .map((node) => filterNodeLinks(node, graph, effectiveLayers));
  }
  if (result.parent)
    output.parent =
      result.parent.layer === undefined ||
      effectiveLayers.includes(result.parent.layer)
        ? filterNodeLinks(result.parent, graph, effectiveLayers)
        : undefined;

  return output;
}

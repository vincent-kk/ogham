import { handleKgNavigate, type KnowledgeGraph } from '@ogham/maencof';

import { computeEffectiveLayers } from '../filter/layer-guard.js';

export interface LensNavigateInput {
  vault?: string;
  path: string;
  include_inbound?: boolean;
  include_outbound?: boolean;
  include_hierarchy?: boolean;
}

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

  if ('error' in result) {
    return { error: 'Vault index not available. Run kg_build in a maencof session.' };
  }

  // Post-filter neighbor nodes by effective layers
  const output = { ...result } as Record<string, unknown>;
  const filterNodes = (nodes: unknown): unknown => {
    if (!Array.isArray(nodes)) return nodes;
    return nodes.filter(
      (n: Record<string, unknown>) =>
        n.layer === undefined || effectiveLayers.includes(n.layer as number),
    );
  };

  if (output.inbound) output.inbound = filterNodes(output.inbound);
  if (output.outbound) output.outbound = filterNodes(output.outbound);
  if (output.children) output.children = filterNodes(output.children);

  return output;
}

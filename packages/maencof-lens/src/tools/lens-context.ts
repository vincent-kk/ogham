import { handleKgContext } from '@ogham/maencof';
import type { KnowledgeGraph } from '@ogham/maencof';

import { computeEffectiveLayers } from '../filter/layer-guard.js';

export interface LensContextInput {
  vault?: string;
  query: string;
  token_budget?: number;
  include_full?: boolean;
  layer_filter?: number[];
}

export async function handleLensContext(
  graph: KnowledgeGraph | null,
  input: LensContextInput,
  vaultPath: string,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(vaultLayers, input.layer_filter);

  const result = await handleKgContext(graph, {
    query: input.query,
    token_budget: input.token_budget,
    include_full: input.include_full,
  }, vaultPath);

  if ('error' in result) {
    return { error: 'Vault index not available. Run kg_build in a maencof session.' };
  }

  // Post-filter: remove context items from excluded layers
  // Note: handleKgContext does not support layerFilter natively (v1 limitation)
  const filtered = { ...(result as unknown as Record<string, unknown>) };
  if (Array.isArray(filtered.items)) {
    const items = filtered.items as Array<Record<string, unknown>>;
    filtered.items = items.filter(
      (item) => item.layer === undefined || effectiveLayers.includes(item.layer as number),
    );
  }

  return filtered;
}

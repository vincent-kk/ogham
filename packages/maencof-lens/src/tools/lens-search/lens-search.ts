import { handleKgSearch } from '@ogham/maencof';
import type { KnowledgeGraph, SubLayer } from '@ogham/maencof';

import { computeEffectiveLayers } from '../../filter/layer-guard/layer-guard.js';

export interface LensSearchInput {
  vault?: string;
  seed: string[];
  max_results?: number;
  decay?: number;
  threshold?: number;
  max_hops?: number;
  layer_filter?: number[];
  sub_layer?: string;
}

export async function handleLensSearch(
  graph: KnowledgeGraph | null,
  input: LensSearchInput,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(vaultLayers, input.layer_filter);

  const result = await handleKgSearch(graph, {
    seed: input.seed,
    max_results: input.max_results,
    decay: input.decay,
    threshold: input.threshold,
    max_hops: input.max_hops,
    layer_filter: effectiveLayers,
    sub_layer: input.sub_layer as SubLayer | undefined,
  });

  if ('error' in result) {
    return { error: 'Vault index not available. Run kg_build in a maencof session.' };
  }

  return result as unknown as Record<string, unknown>;
}

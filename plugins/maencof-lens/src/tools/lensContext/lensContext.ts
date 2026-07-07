import { handleKgContext } from "@ogham/maencof";
import type { KgContextScope, KnowledgeGraph, SubLayer } from "@ogham/maencof";

import { computeEffectiveLayers } from "../../filter/layerGuard/layerGuard.js";

export interface LensContextInput {
  vault?: string;
  query: string;
  token_budget?: number;
  include_full?: boolean;
  layer_filter?: number[];
  sub_layer?: string;
  scope?: string;
}

export async function handleLensContext(
  graph: KnowledgeGraph | null,
  input: LensContextInput,
  vaultPath: string,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(
    vaultLayers,
    input.layer_filter,
  );

  const result = await handleKgContext(
    graph,
    {
      query: input.query,
      token_budget: input.token_budget,
      include_full: input.include_full,
      layer_filter: effectiveLayers,
      sub_layer: input.sub_layer as SubLayer | undefined,
      scope: input.scope as KgContextScope | undefined,
    },
    vaultPath,
  );

  if ("error" in result)
    return {
      error: "Vault index not available. Run kg_build in a maencof session.",
    };

  return result as unknown as Record<string, unknown>;
}

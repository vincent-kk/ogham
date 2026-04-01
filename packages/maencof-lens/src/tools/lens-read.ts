import { handleMaencofRead } from '@maencof/mcp/tools/maencof-read.js';

import { computeEffectiveLayers } from '../filter/layer-guard.js';

export interface LensReadInput {
  vault?: string;
  path: string;
}

export async function handleLensRead(
  input: LensReadInput,
  vaultPath: string,
  vaultLayers: number[],
): Promise<Record<string, unknown>> {
  const effectiveLayers = computeEffectiveLayers(vaultLayers, undefined);

  // handleMaencofRead takes (vaultPath, input), not graph
  const result = await handleMaencofRead(vaultPath, { path: input.path });

  // Check result node's layer from frontmatter
  const raw = result as unknown as Record<string, unknown>;
  const node = raw.node as Record<string, unknown> | undefined;
  if (node?.layer !== undefined && !effectiveLayers.includes(node.layer as number)) {
    return { error: `Document is in a restricted layer (L${node.layer})` };
  }

  return raw;
}

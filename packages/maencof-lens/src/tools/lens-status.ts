import { handleKgStatus } from '@maencof/mcp/tools/kg-status.js';
import type { KnowledgeGraph } from '@maencof/types/graph.js';

import { detectStale } from '../vault/stale-detector.js';

export interface LensStatusInput {
  vault?: string;
}

export async function handleLensStatus(
  vaultPath: string,
  graph: KnowledgeGraph | null,
): Promise<Record<string, unknown>> {
  const result = await handleKgStatus(vaultPath, graph, {});

  // Add stale warning
  const staleInfo = await detectStale(vaultPath);
  const output = { ...result } as Record<string, unknown>;

  if (staleInfo.isStale) {
    output.staleWarning = `Vault index is stale (${staleInfo.staleSince ?? 'unknown'}). Run kg_build in a maencof session to refresh.`;
  }

  output.readOnly = true;
  output.message = 'This is a read-only view. To rebuild, run kg_build in a maencof session.';

  return output;
}

import { handleKgStatus } from "@ogham/maencof";
import type { KnowledgeGraph } from "@ogham/maencof";

import { detectStale } from "../../vault/staleDetector/staleDetector.js";

export interface LensStatusInput {
  vault?: string;
}

export async function handleLensStatus(
  vaultPath: string,
  graph: KnowledgeGraph | null,
): Promise<Record<string, unknown>> {
  const result = await handleKgStatus(vaultPath, graph, {});
  const staleInfo = await detectStale(vaultPath);
  const output = { ...result } as Record<string, unknown>;

  if (staleInfo.isStale)
    if (staleInfo.markerKind === "legacy")
      output.staleWarning =
        "Vault index is on the legacy v1 schema. Run kg_build in a maencof session to migrate to the v2 sharded layout.";
    else
      output.staleWarning = `Vault index is stale (${staleInfo.staleSince ?? "unknown"}). Run kg_build in a maencof session to refresh.`;

  output.readOnly = true;
  output.message =
    "This is a read-only view. To rebuild, run kg_build in a maencof session.";

  return output;
}

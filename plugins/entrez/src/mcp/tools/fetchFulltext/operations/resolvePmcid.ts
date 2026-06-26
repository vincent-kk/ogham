import type { ToolContext } from "../../../shared/index.js";
import { idconv } from "../../../../adapters/eutils/index.js";

const PMCID_PATTERN = /^pmc\d+$/i;
const PMID_IDTYPE = "pmid";

export interface ResolvedIds {
  pmcid?: string;
  pmid?: string;
  doi?: string;
}

/**
 * Resolve an input id (PMID or PMCID) to a PMCID. A PMCID is used directly; a
 * PMID is converted via the PMC ID Converter (also yielding doi for fallback links).
 */
export async function resolvePmcid(
  id: string,
  ctx: ToolContext,
): Promise<ResolvedIds> {
  if (PMCID_PATTERN.test(id)) return { pmcid: id.toUpperCase() };
  const result = await idconv({ ids: [id], idtype: PMID_IDTYPE }, ctx.deps);
  const record = result.records[0];
  return { pmcid: record?.pmcid, pmid: record?.pmid ?? id, doi: record?.doi };
}

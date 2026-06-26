import type { ToolContext } from "../../../shared/index.js";
import { idconv } from "../../../../adapters/eutils/index.js";

const PMCID_PATTERN = /^pmc\d+$/i;
const PMID_IDTYPE = "pmid";

export interface ResolvedIds {
  pmcid?: string;
  versionedPmcid?: string;
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
  const versionedPmcid = record?.versions?.find(
    (version) => version.current,
  )?.pmcid;
  return {
    pmcid: record?.pmcid,
    versionedPmcid,
    pmid: record?.pmid ?? id,
    doi: record?.doi,
  };
}

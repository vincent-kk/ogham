import type { PaperRecord } from "../../../types/record.js";
import type { QueryRole } from "../../../types/enums.js";

function uniqStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqRoles(values: QueryRole[]): QueryRole[] {
  return [...new Set(values)];
}

/**
 * Merge `incoming` into `base` for the same deduped record: accumulate
 * `hit_by` / `query_role` (recall attribution) and fill any missing fields,
 * preferring the fuller value. Returns a new record; never drops attribution.
 */
export function tagHitBy(
  base: PaperRecord,
  incoming: PaperRecord,
): PaperRecord {
  return {
    ...base,
    doi: base.doi ?? incoming.doi,
    pmcid: base.pmcid ?? incoming.pmcid,
    title: base.title || incoming.title,
    abstract: base.abstract ?? incoming.abstract,
    journal: base.journal ?? incoming.journal,
    year: base.year ?? incoming.year,
    mesh: base.mesh ?? incoming.mesh,
    hit_by: uniqStrings([...base.hit_by, ...incoming.hit_by]),
    query_role: uniqRoles([...base.query_role, ...incoming.query_role]),
    expansion_source: base.expansion_source ?? incoming.expansion_source,
  };
}

import type { PaperRecord } from "../../../types/record.js";
import { normalizeTitle } from "./normalizeTitle.js";

const PMID_PREFIX = "pmid:";
const DOI_PREFIX = "doi:";
const TITLE_PREFIX = "title:";

/**
 * Composite dedup key, in priority order: PMID → DOI → normalized title. The
 * prefix prevents cross-type collisions. PubMed always has a PMID; DOI/title
 * fall back for cross-source merges (sibling plugins).
 */
export function dedupKey(record: PaperRecord): string {
  if (record.pmid) return `${PMID_PREFIX}${record.pmid}`;
  if (record.doi) return `${DOI_PREFIX}${record.doi.toLowerCase()}`;
  return `${TITLE_PREFIX}${normalizeTitle(record.title)}`;
}

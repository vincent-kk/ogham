import { ErrorCode, MeshMatch } from "../../../../../types/enums.js";
import type {
  MeshLookupInput,
  MeshMapping,
} from "../../../../../types/tool.js";

/** Optional MeSH fields supplied by an ESummary record. */
interface RawMeshSummary {
  /** Descriptor name followed by its entry terms. */
  ds_meshterms?: string[];
  /** Stable descriptor identifier. */
  ds_meshui?: string;
  /** Optional descriptor scope note. */
  ds_scopenote?: string;
  /** Fallback descriptor label. */
  title?: string;
  /** Alternate descriptor label when no title is supplied. */
  name?: string;
}

/**
 * Parse an ESummary MeSH record using the fields checked by the live smoke suite.
 * @param term Original query term to preserve in the mapping.
 * @param uid ESearch identifier whose summary must be present.
 * @param jsonText JSON response from ESummary for this identifier.
 * @param input Lookup options controlling scope-note inclusion.
 * @returns The mapped descriptor and optional vocabulary metadata.
 * @throws When JSON cannot be parsed or the requested summary is missing.
 */
export function parseMeshSummary(
  term: string,
  uid: string,
  jsonText: string,
  input: MeshLookupInput,
): MeshMapping {
  const parsed = JSON.parse(jsonText) as {
    result?: Record<string, RawMeshSummary>;
  };
  const rec = parsed.result?.[uid];
  if (!rec) throw new Error(ErrorCode.PARSE_ERROR);

  const entryTerms = Array.isArray(rec.ds_meshterms)
    ? rec.ds_meshterms
    : undefined;
  const descriptorName = entryTerms?.[0] ?? rec.title ?? rec.name;

  return {
    input: term,
    matched: descriptorName ? MeshMatch.DESCRIPTOR : MeshMatch.NONE,
    descriptorName,
    descriptorUi: rec.ds_meshui ?? uid,
    entryTerms,
    scopeNote: input.includeScopeNote === false ? undefined : rec.ds_scopenote,
  };
}

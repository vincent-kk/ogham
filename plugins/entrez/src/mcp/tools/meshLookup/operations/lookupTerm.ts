import { Db, MeshMatch, EutilFn, RetMode } from "../../../../types/enums.js";
import type { MeshLookupInput, MeshMapping } from "../../../../types/tool.js";
import type { ToolContext } from "../../../shared/index.js";
import { esearch } from "../../../../adapters/eutils/index.js";
import { buildBaseUrl } from "../../../../core/sourceResolver/index.js";
import { httpRequest } from "../../../../core/httpClient/index.js";

const VERSION_2 = "2.0";

interface RawMeshSummary {
  ds_meshterms?: string[];
  ds_meshui?: string;
  ds_scopenote?: string;
  title?: string;
  name?: string;
}

/**
 * Map an ESummary (db=mesh) record to a MeshMapping. ⚠️ MeSH ESummary field
 * names are verified against live data in the @live smoke suite; parsed
 * defensively here.
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
  if (!rec) return { input: term, matched: MeshMatch.NONE };

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

/** Look up one term against db=mesh: ESearch → ESummary → MeshMapping. */
export async function lookupTerm(
  term: string,
  ctx: ToolContext,
  input: MeshLookupInput,
): Promise<MeshMapping> {
  const search = await esearch(
    { db: Db.MESH, term, retmax: 1, baseUrl: ctx.baseUrl },
    ctx.deps,
  );
  const uid = search.idList[0];
  if (!uid) return { input: term, matched: MeshMatch.NONE };

  const res = await httpRequest(
    {
      url: buildBaseUrl(EutilFn.ESUMMARY, ctx.baseUrl),
      params: {
        db: Db.MESH,
        id: uid,
        retmode: RetMode.JSON,
        version: VERSION_2,
      },
    },
    ctx.deps,
  );
  if (!res.ok || res.text === undefined)
    return { input: term, matched: MeshMatch.NONE };

  return parseMeshSummary(term, uid, res.text, input);
}

import { Db, MeshMatch, EutilFn, RetMode } from "../../../../types/enums.js";
import type { MeshLookupInput, MeshMapping } from "../../../../types/tool.js";
import type { ToolContext } from "../../../shared/index.js";
import { esearch } from "../../../../adapters/eutils/index.js";
import { buildBaseUrl } from "../../../../core/sourceResolver/index.js";
import { httpRequest } from "../../../../core/httpClient/index.js";
import { parseMeshSummary } from "./helpers/parseMeshSummary.js";

/** ESummary version providing the MeSH fields consumed by the parser. */
const VERSION_2 = "2.0";

/** Public failure reason excludes raw exceptions and remote response content. */
const LOOKUP_FAILED = "MeSH lookup failed";

/**
 * Resolve one term without allowing its lookup failure to abort other terms.
 * @param term Natural-language term to query against MeSH.
 * @param ctx Configuration and injected HTTP dependencies for NCBI requests.
 * @param input Lookup options controlling the returned vocabulary metadata.
 * @returns A descriptor, a genuine miss, or NONE with a fixed lookup error.
 */
export async function lookupTerm(
  term: string,
  ctx: ToolContext,
  input: MeshLookupInput,
): Promise<MeshMapping> {
  try {
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
      return { input: term, matched: MeshMatch.NONE, error: LOOKUP_FAILED };

    return parseMeshSummary(term, uid, res.text, input);
  } catch {
    return { input: term, matched: MeshMatch.NONE, error: LOOKUP_FAILED };
  }
}

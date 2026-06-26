import type { MeshLookupInput, MeshLookupOutput } from "../../../types/tool.js";
import type { ToolContext } from "../../shared/index.js";
import { lookupTerm } from "./operations/lookupTerm.js";

/**
 * mesh_lookup — map natural-language terms to MeSH descriptors (input material
 * for query generation / explosion decisions). One ESearch + ESummary per term.
 */
export async function runMeshLookup(
  input: MeshLookupInput,
  ctx: ToolContext,
): Promise<MeshLookupOutput> {
  const mappings = [];
  for (const term of input.terms) {
    mappings.push(await lookupTerm(term, ctx, input));
  }
  return { mappings };
}

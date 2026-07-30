import { EutilFn, ErrorCode, type Db } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import { buildBaseUrl } from "../../core/sourceResolver/index.js";
import { httpRequest } from "../../core/httpClient/index.js";
import { parseXml, textOf } from "../../lib/xmlParse.js";

export interface EspellArgs {
  db: Db;
  term: string;
  baseUrl?: string;
}

type Node = Record<string, unknown>;

/** Parse the eSpellResult XML; returns the corrected query (empty if none). */
export function parseEspell(xml: string): string {
  const doc = parseXml(xml) as { eSpellResult?: Node } | null;
  const corrected = textOf(doc?.eSpellResult?.CorrectedQuery);
  return corrected?.trim() ?? "";
}

/** ESpell — spelling correction (XML-only endpoint). */
export async function espell(
  args: EspellArgs,
  deps: HttpDeps,
): Promise<string> {
  const url = buildBaseUrl(EutilFn.ESPELL, args.baseUrl);
  const res = await httpRequest(
    { url, params: { db: args.db, term: args.term } },
    deps,
  );
  if (!res.ok || res.text === undefined)
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: espell`);

  return parseEspell(res.text);
}

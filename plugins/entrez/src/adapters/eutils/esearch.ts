import {
  EutilFn,
  RetMode,
  type Db,
  type SortOrder,
  type DateType,
} from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { EsearchResult } from "../../types/eutils.js";
import { ErrorCode } from "../../types/enums.js";
import { buildBaseUrl } from "../../core/sourceResolver/index.js";
import { httpRequest } from "../../core/httpClient/index.js";

export interface EsearchArgs {
  db: Db;
  term: string;
  retmax?: number;
  retstart?: number;
  sort?: SortOrder;
  /** Date filter (mindate/maxdate + datetype) — used for segmentation probes. */
  datetype?: DateType;
  mindate?: string;
  maxdate?: string;
  useHistory?: boolean;
  webEnv?: string;
  queryKey?: string;
  baseUrl?: string;
}

const YES = "y";

/** Parse the ESearch JSON envelope. */
export function parseEsearch(jsonText: string): EsearchResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${ErrorCode.PARSE_ERROR}: invalid ESearch JSON`);
  }
  const result = (parsed as { esearchresult?: Record<string, unknown> })
    .esearchresult;
  if (!result)
    throw new Error(`${ErrorCode.PARSE_ERROR}: missing esearchresult`);

  const warnings: string[] = [];
  const warningList = result.warninglist as
    | { outputmessages?: string[]; phrasesnotfound?: string[] }
    | undefined;
  if (warningList?.outputmessages) warnings.push(...warningList.outputmessages);
  if (warningList?.phrasesnotfound)
    warnings.push(...warningList.phrasesnotfound);

  return {
    count: Number(result.count ?? 0),
    idList: Array.isArray(result.idlist) ? (result.idlist as string[]) : [],
    queryTranslation:
      typeof result.querytranslation === "string" && result.querytranslation
        ? result.querytranslation
        : undefined,
    webEnv: typeof result.webenv === "string" ? result.webenv : undefined,
    queryKey: typeof result.querykey === "string" ? result.querykey : undefined,
    warnings,
  };
}

/** ESearch — count probe, UID list, QueryTranslation, optional history. */
export async function esearch(
  args: EsearchArgs,
  deps: HttpDeps,
): Promise<EsearchResult> {
  const url = buildBaseUrl(EutilFn.ESEARCH, args.baseUrl);
  const res = await httpRequest(
    {
      url,
      params: {
        db: args.db,
        term: args.term,
        retmax: args.retmax ?? 0,
        retstart: args.retstart,
        retmode: RetMode.JSON,
        sort: args.sort,
        datetype: args.datetype,
        mindate: args.mindate,
        maxdate: args.maxdate,
        usehistory: args.useHistory ? YES : undefined,
        WebEnv: args.webEnv,
        query_key: args.queryKey,
      },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: esearch`);
  }
  return parseEsearch(res.text);
}

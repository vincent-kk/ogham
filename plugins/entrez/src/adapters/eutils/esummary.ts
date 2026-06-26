import { EutilFn, RetMode, ErrorCode, type Db } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { EsummaryRecord } from "../../types/eutils.js";
import { buildBaseUrl } from "../../core/sourceResolver/index.js";
import { httpRequest } from "../../core/httpClient/index.js";

export interface EsummaryArgs {
  db: Db;
  ids: string[];
  webEnv?: string;
  queryKey?: string;
  retstart?: number;
  retmax?: number;
  baseUrl?: string;
}

interface RawArticleId {
  idtype?: string;
  value?: string;
}
interface RawSummary {
  uid?: string;
  title?: string;
  fulljournalname?: string;
  source?: string;
  pubdate?: string;
  authors?: { name?: string }[];
  articleids?: RawArticleId[];
}

function yearFromPubdate(pubdate?: string): number | undefined {
  if (!pubdate) return undefined;
  const match = pubdate.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

/** Parse the ESummary (v2 JSON) `result` envelope into records. */
export function parseEsummary(jsonText: string): EsummaryRecord[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${ErrorCode.PARSE_ERROR}: invalid ESummary JSON`);
  }
  const result = (parsed as { result?: Record<string, unknown> }).result;
  if (!result) return [];
  const uids = Array.isArray(result.uids) ? (result.uids as string[]) : [];

  return uids.map((uid) => {
    const raw = (result[uid] ?? {}) as RawSummary;
    const ids = raw.articleids ?? [];
    const doi = ids.find((i) => i.idtype === "doi")?.value;
    const pmcid = ids.find((i) => i.idtype === "pmc" || i.idtype === "pmcid")?.value;
    return {
      pmid: raw.uid ?? uid,
      title: raw.title,
      journal: raw.fulljournalname ?? raw.source,
      year: yearFromPubdate(raw.pubdate),
      doi,
      pmcid,
      authorNames: (raw.authors ?? [])
        .map((a) => a.name)
        .filter((n): n is string => Boolean(n)),
    };
  });
}

/** ESummary — lightweight record metadata (no abstract). */
export async function esummary(
  args: EsummaryArgs,
  deps: HttpDeps,
): Promise<EsummaryRecord[]> {
  const url = buildBaseUrl(EutilFn.ESUMMARY, args.baseUrl);
  const res = await httpRequest(
    {
      url,
      params: {
        db: args.db,
        id: args.ids.length > 0 ? args.ids.join(",") : undefined,
        WebEnv: args.webEnv,
        query_key: args.queryKey,
        retstart: args.retstart,
        retmax: args.retmax,
        retmode: RetMode.JSON,
        version: "2.0",
      },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: esummary`);
  }
  return parseEsummary(res.text);
}

import { ErrorCode } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { IdConvResult, IdConvMapping } from "../../types/eutils.js";
import { IDCONV_BASE } from "../../constants/defaults.js";
import { httpRequest } from "../../core/httpClient/index.js";

export interface IdConvArgs {
  ids: string[];
  /** Input id type: pmid | pmcid | doi | mid. Default pmid. */
  idtype?: string;
  baseUrl?: string;
}

const FORMAT_JSON = "json";
const NO_VERSIONS = "no";
const DEFAULT_IDTYPE = "pmid";

interface RawRecord {
  pmid?: string | number;
  pmcid?: string;
  doi?: string;
  status?: string;
  errmsg?: string;
  "requested-id"?: string;
  versions?: RawVersion[];
}

interface RawVersion {
  pmcid?: string;
  current?: boolean;
}

function stringValue(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}

/** Parse the PMC ID Converter JSON response. */
export function parseIdConv(jsonText: string): IdConvResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${ErrorCode.PARSE_ERROR}: invalid idconv JSON`);
  }
  const body = parsed as { status?: string; records?: RawRecord[] };
  const records: IdConvMapping[] = (body.records ?? []).map((r) => ({
    pmid: stringValue(r.pmid),
    pmcid: r.pmcid,
    doi: r.doi,
    status: r.status,
    errmsg: r.errmsg,
    requestedId: r["requested-id"],
    versions: r.versions?.map((version) => ({
      pmcid: version.pmcid,
      current: version.current,
    })),
  }));
  return { status: body.status ?? "", records };
}

/**
 * PMC ID Converter — map between PMID / PMCID / DOI. Uses the PMC utils host
 * (not eutils); auth injection is off (no api_key for this endpoint).
 */
export async function idconv(
  args: IdConvArgs,
  deps: HttpDeps,
): Promise<IdConvResult> {
  const res = await httpRequest(
    {
      url: args.baseUrl ?? IDCONV_BASE,
      injectAuth: false,
      params: {
        ids: args.ids.join(","),
        idtype: args.idtype ?? DEFAULT_IDTYPE,
        format: FORMAT_JSON,
        versions: NO_VERSIONS,
        tool: deps.tool,
        email: deps.email,
      },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: idconv`);
  }
  return parseIdConv(res.text);
}

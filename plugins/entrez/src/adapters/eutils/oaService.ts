import { OaStatus, ErrorCode } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { OaRecord, OaFormatLink } from "../../types/eutils.js";
import { OA_SERVICE_BASE } from "../../constants/defaults.js";
import { httpRequest } from "../../core/httpClient/index.js";
import { parseXml, asArray, textOf } from "../../lib/xmlParse.js";

export interface OaArgs {
  pmcid: string;
  /** Optional format filter (pdf | tgz). */
  format?: string;
  baseUrl?: string;
}

type Node = Record<string, unknown>;

function parseLinks(record: Node): OaFormatLink[] {
  return asArray<Node>(record.link as Node | Node[] | undefined)
    .map((link) => ({
      format: String(link["@_format"] ?? ""),
      href: String(link["@_href"] ?? ""),
    }))
    .filter((l) => l.href.length > 0);
}

/** Parse the oa.fcgi XML into an open-access record (or an error marker). */
export function parseOa(xml: string, pmcid: string): OaRecord {
  const doc = parseXml(xml) as { OA?: Node } | null;
  const records = doc?.OA?.records as Node | undefined;

  const errorNode = (records?.error ?? (doc?.OA as Node | undefined)?.error) as
    | Node
    | string
    | undefined;
  if (errorNode) {
    const code =
      typeof errorNode === "object"
        ? String((errorNode as Node)["@_code"] ?? "")
        : "";
    return {
      pmcid,
      oaStatus: OaStatus.NOT_OPEN_ACCESS,
      formats: [],
      errorCode: code || undefined,
    };
  }

  const record = asArray<Node>(records?.record as Node | Node[] | undefined)[0];
  if (!record) {
    return { pmcid, oaStatus: OaStatus.UNKNOWN, formats: [] };
  }

  return {
    pmcid: String(record["@_id"] ?? pmcid),
    oaStatus: OaStatus.OPEN_ACCESS,
    license: textOf(record["@_license"]),
    formats: parseLinks(record),
  };
}

/**
 * oa.fcgi — determine PMC Open Access availability, license, and per-format
 * download links. Uses the PMC utils host; auth injection is off.
 */
export async function oaService(
  args: OaArgs,
  deps: HttpDeps,
): Promise<OaRecord> {
  const res = await httpRequest(
    {
      url: args.baseUrl ?? OA_SERVICE_BASE,
      injectAuth: false,
      params: { id: args.pmcid, format: args.format },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: oa.fcgi`);
  }
  return parseOa(res.text, args.pmcid);
}

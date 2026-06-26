import { EutilFn, RetMode, ErrorCode, Db } from "../../types/enums.js";
import type { HttpDeps } from "../../types/http.js";
import type { ElinkResult } from "../../types/eutils.js";
import { buildBaseUrl } from "../../core/sourceResolver/index.js";
import { httpRequest } from "../../core/httpClient/index.js";

export interface ElinkArgs {
  seedPmids: string[];
  /** ELink linkname; defaults to PubMed "Similar Articles". */
  linkname?: string;
  baseUrl?: string;
}

const NEIGHBOR = "neighbor";
const SIMILAR_LINKNAME = "pubmed_pubmed";

interface RawLinkSetDb {
  linkname?: string;
  links?: { id?: string }[] | string[];
}
interface RawLinkSet {
  ids?: string[];
  linksetdbs?: RawLinkSetDb[];
}

function extractLinks(linksetdb: RawLinkSetDb): string[] {
  const links = linksetdb.links ?? [];
  return links.map((l) => (typeof l === "string" ? l : (l.id ?? ""))).filter(Boolean);
}

/** Parse the ELink JSON envelope into seed + linked PMIDs (deduped, seeds removed). */
export function parseElink(jsonText: string, linkname: string): ElinkResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${ErrorCode.PARSE_ERROR}: invalid ELink JSON`);
  }
  const linksets = (parsed as { linksets?: RawLinkSet[] }).linksets ?? [];
  const seedPmids = new Set<string>();
  const linked = new Set<string>();

  for (const set of linksets) {
    for (const id of set.ids ?? []) seedPmids.add(String(id));
    for (const db of set.linksetdbs ?? []) {
      if (db.linkname === linkname) {
        for (const id of extractLinks(db)) linked.add(String(id));
      }
    }
  }
  for (const seed of seedPmids) linked.delete(seed);

  return { seedPmids: [...seedPmids], linkedPmids: [...linked] };
}

/** ELink — expand a seed set via Similar Articles (recall expansion). */
export async function elink(
  args: ElinkArgs,
  deps: HttpDeps,
): Promise<ElinkResult> {
  const linkname = args.linkname ?? SIMILAR_LINKNAME;
  const url = buildBaseUrl(EutilFn.ELINK, args.baseUrl);
  const res = await httpRequest(
    {
      url,
      params: {
        dbfrom: Db.PUBMED,
        db: Db.PUBMED,
        cmd: NEIGHBOR,
        linkname,
        id: args.seedPmids.join(","),
        retmode: RetMode.JSON,
      },
    },
    deps,
  );
  if (!res.ok || res.text === undefined) {
    throw new Error(res.error?.message ?? `${ErrorCode.EUTILS_ERROR}: elink`);
  }
  return parseElink(res.text, linkname);
}

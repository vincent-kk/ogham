import { Db } from "../../types/enums.js";
import type { ToolContext } from "../shared/index.js";
import { EntrezConfigSchema } from "../../types/config.js";
import {
  EUTILS_HOST,
  NCBI_SERVICE_HOST,
  PMC_OA_S3_HOST,
  PMC_SERVICE_HOST,
  DEFAULT_EUTILS_BASE,
} from "../../constants/defaults.js";

export interface MockResponse {
  body: BodyInit;
  status?: number;
  contentType?: string;
}

export type RouteHandler = (url: URL, init?: RequestInit) => MockResponse;

/** Build a fetch double that routes by URL (tests inject this into HttpDeps). */
export function routeFetch(handler: RouteHandler): typeof fetch {
  return (async (u: string | URL, init?: RequestInit) => {
    const url = new URL(String(u));
    const r = handler(url, init);
    return new Response(r.body, {
      status: r.status ?? 200,
      headers: { "content-type": r.contentType ?? "application/json" },
    });
  }) as unknown as typeof fetch;
}

/** Build a ToolContext wired to a mock fetch (no disk config, temp manifest dir). */
export function makeCtx(
  fetchImpl: typeof fetch,
  overrides: Partial<ToolContext> = {},
): ToolContext {
  const config = EntrezConfigSchema.parse({
    tool: "entrez-test",
    email: "user@example.com",
  });
  return {
    config,
    credentials: {},
    deps: {
      tool: config.tool,
      email: config.email,
      allowedHosts: [
        EUTILS_HOST,
        NCBI_SERVICE_HOST,
        PMC_SERVICE_HOST,
        PMC_OA_S3_HOST,
      ],
      allowPrivateIp: true,
      sleep: async () => {},
      fetchImpl,
    },
    baseUrl: DEFAULT_EUTILS_BASE,
    db: Db.PUBMED,
    nowMs: 1_700_000_000_000,
    ...overrides,
  };
}

/** ESearch JSON with the given count + ids. */
export function esearchJson(
  count: number,
  ids: string[],
  translation = "x[mh]",
): string {
  return JSON.stringify({
    esearchresult: {
      count: String(count),
      retmax: String(ids.length),
      idlist: ids,
      querytranslation: translation,
    },
  });
}

/** ESummary v2 JSON for the given pmids. */
export function esummaryJson(pmids: string[]): string {
  const result: Record<string, unknown> = { uids: pmids };
  for (const pmid of pmids)
    result[pmid] = {
      uid: pmid,
      title: `Title ${pmid}`,
      fulljournalname: "J Test",
      pubdate: "2020 Jan",
      authors: [{ name: "Doe J" }],
      articleids: [{ idtype: "doi", value: `10.1/${pmid}` }],
    };

  return JSON.stringify({ result });
}

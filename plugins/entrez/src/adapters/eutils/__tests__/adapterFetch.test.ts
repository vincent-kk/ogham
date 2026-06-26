import { describe, it, expect } from "vitest";

import { esearch } from "../esearch.js";
import { efetch } from "../efetch.js";
import { esummary } from "../esummary.js";
import { espell } from "../espell.js";
import { elink } from "../elink.js";
import { idconv } from "../idconv.js";
import { oaService } from "../oaService.js";
import type { HttpDeps } from "../../../types/http.js";
import { Db, SortOrder, DateType } from "../../../types/enums.js";
import { EUTILS_HOST, NCBI_SERVICE_HOST } from "../../../constants/defaults.js";
import {
  ESEARCH_JSON,
  EFETCH_XML,
  ESUMMARY_JSON,
  ESPELL_XML,
  ELINK_JSON,
  IDCONV_JSON,
  OA_XML,
} from "./fixtures.js";

let lastUrl = "";

function deps(
  body: string,
  contentType = "application/json",
  apiKey?: string,
  status = 200,
): HttpDeps {
  return {
    tool: "entrez-test",
    email: "user@example.com",
    apiKey,
    allowedHosts: [EUTILS_HOST, NCBI_SERVICE_HOST],
    allowPrivateIp: true,
    sleep: async () => {},
    fetchImpl: (async (u: string | URL) => {
      lastUrl = String(u);
      return new Response(body, {
        status,
        headers: { "content-type": contentType },
      });
    }) as unknown as typeof fetch,
  };
}

describe("eutils adapter fetch wrappers", () => {
  it("esearch hits esearch.fcgi (json) with injected identity", async () => {
    const r = await esearch(
      { db: Db.PUBMED, term: "cancer" },
      deps(ESEARCH_JSON),
    );
    expect(r.count).toBe(1234);
    const q = new URL(lastUrl);
    expect(q.pathname).toContain("esearch.fcgi");
    expect(q.searchParams.get("retmode")).toBe("json");
    expect(q.searchParams.get("tool")).toBe("entrez-test");
    expect(q.searchParams.get("email")).toBe("user@example.com");
  });

  it("efetch hits efetch.fcgi (xml) and returns structured records", async () => {
    const r = await efetch(
      { db: Db.PUBMED, ids: ["12345678"] },
      deps(EFETCH_XML, "application/xml"),
    );
    expect(r).toHaveLength(2);
    expect(new URL(lastUrl).searchParams.get("retmode")).toBe("xml");
  });

  it("esummary hits esummary.fcgi and returns records", async () => {
    const r = await esummary(
      { db: Db.PUBMED, ids: ["111"] },
      deps(ESUMMARY_JSON),
    );
    expect(r[0].pmid).toBe("111");
    expect(new URL(lastUrl).pathname).toContain("esummary.fcgi");
  });

  it("espell hits espell.fcgi and returns the correction", async () => {
    const r = await espell(
      { db: Db.PUBMED, term: "astma" },
      deps(ESPELL_XML, "application/xml"),
    );
    expect(r).toBe("asthma");
    expect(new URL(lastUrl).pathname).toContain("espell.fcgi");
  });

  it("elink hits elink.fcgi (neighbor) and returns linked PMIDs", async () => {
    const r = await elink({ seedPmids: ["111"] }, deps(ELINK_JSON));
    expect(r.linkedPmids.sort()).toEqual(["222", "333"]);
    expect(new URL(lastUrl).searchParams.get("cmd")).toBe("neighbor");
  });

  it("idconv uses the PMC host and never sends api_key", async () => {
    const r = await idconv(
      { ids: ["11"] },
      deps(IDCONV_JSON, "application/json", "SECRET"),
    );
    expect(r.records[0].pmcid).toBe("PMC1");
    const q = new URL(lastUrl);
    expect(q.hostname).toBe(NCBI_SERVICE_HOST);
    expect(q.searchParams.get("api_key")).toBeNull();
    expect(q.searchParams.get("tool")).toBe("entrez-test");
  });

  it("oaService uses the PMC host and parses the OA record", async () => {
    const r = await oaService(
      { pmcid: "PMC13900" },
      deps(OA_XML, "application/xml"),
    );
    expect(r.license).toBe("CC BY");
    expect(new URL(lastUrl).hostname).toBe(NCBI_SERVICE_HOST);
  });

  it("throws when the endpoint returns a fatal error", async () => {
    await expect(
      esearch(
        { db: Db.PUBMED, term: "x" },
        deps("bad", "text/plain", undefined, 400),
      ),
    ).rejects.toThrow();
  });

  it("esearch forwards date-range and sort/history params", async () => {
    await esearch(
      {
        db: Db.PUBMED,
        term: "cancer",
        retmax: 100,
        retstart: 20,
        sort: SortOrder.PUB_DATE,
        datetype: DateType.PUBLICATION,
        mindate: "2000/01/01",
        maxdate: "2009/12/31",
        useHistory: true,
        webEnv: "WE",
        queryKey: "2",
      },
      deps(ESEARCH_JSON),
    );
    const q = new URL(lastUrl).searchParams;
    expect(q.get("mindate")).toBe("2000/01/01");
    expect(q.get("maxdate")).toBe("2009/12/31");
    expect(q.get("datetype")).toBe(DateType.PUBLICATION);
    expect(q.get("sort")).toBe(SortOrder.PUB_DATE);
    expect(q.get("usehistory")).toBe("y");
    expect(q.get("WebEnv")).toBe("WE");
  });

  it("esummary and efetch forward history paging params", async () => {
    await esummary(
      {
        db: Db.PUBMED,
        ids: [],
        webEnv: "WE",
        queryKey: "1",
        retstart: 0,
        retmax: 50,
      },
      deps(ESUMMARY_JSON),
    );
    expect(new URL(lastUrl).searchParams.get("WebEnv")).toBe("WE");

    await efetch(
      {
        db: Db.PUBMED,
        ids: [],
        webEnv: "WE",
        queryKey: "1",
        retstart: 200,
        retmax: 200,
      },
      deps(EFETCH_XML, "application/xml"),
    );
    const q = new URL(lastUrl).searchParams;
    expect(q.get("retstart")).toBe("200");
    expect(q.get("query_key")).toBe("1");
  });

  it("oaService forwards a format filter", async () => {
    await oaService(
      { pmcid: "PMC13900", format: "pdf" },
      deps(OA_XML, "application/xml"),
    );
    expect(new URL(lastUrl).searchParams.get("format")).toBe("pdf");
  });
});

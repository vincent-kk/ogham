import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { McpToolName } from "../../constants/mcpToolNames.js";

import { runMeshLookup } from "../tools/meshLookup/meshLookup.js";
import { runFetchFulltext } from "../tools/fetchFulltext/fetchFulltext.js";
import { runAuthCheck } from "../tools/authCheck/authCheck.js";
import { saveConfig, saveCredentials } from "../../core/config/index.js";
import { FulltextFormat, MeshMatch, RateLimit } from "../../types/enums.js";
import { routeFetch, makeCtx } from "./mockEutils.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "entrez-tools-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const MESH_SUMMARY = JSON.stringify({
  result: {
    uids: ["D1"],
    D1: {
      ds_meshui: "D000001",
      ds_meshterms: ["Calcimycin", "A-23187"],
      ds_scopenote: "An ionophore.",
    },
  },
});

describe(McpToolName.MESH_LOOKUP, () => {
  it("maps a term to a MeSH descriptor", async () => {
    const fetch = routeFetch((url) => {
      if (url.pathname.endsWith("esearch.fcgi"))
        return {
          body: JSON.stringify({
            esearchresult: { count: "1", idlist: ["D1"] },
          }),
        };
      return { body: MESH_SUMMARY };
    });
    const out = await runMeshLookup(
      { terms: ["calcium ionophore"] },
      makeCtx(fetch),
    );
    expect(out.mappings[0].matched).toBe(MeshMatch.DESCRIPTOR);
    expect(out.mappings[0].descriptorName).toBe("Calcimycin");
    expect(out.mappings[0].descriptorUi).toBe("D000001");
    expect(out.mappings[0].scopeNote).toBe("An ionophore.");
  });

  it("returns NONE for an unmatched term", async () => {
    const fetch = routeFetch(() => ({
      body: JSON.stringify({ esearchresult: { count: "0", idlist: [] } }),
    }));
    const out = await runMeshLookup({ terms: ["zzzzz"] }, makeCtx(fetch));
    expect(out.mappings[0].matched).toBe(MeshMatch.NONE);
  });
});

const OA_OK = `<OA><records><record id="PMC9" license="CC BY"><link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/x.pdf"/></record></records></OA>`;
const OA_NO_LICENSE = `<OA><records><record id="PMC9"><link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/x.pdf"/></record></records></OA>`;
const OA_NOT_OA = `<OA><error code="idIsNotOpenAccess">no</error></OA>`;

function fulltextRouter(oaXml: string) {
  return routeFetch((url) => {
    if (url.pathname.includes("idconv"))
      return {
        body: JSON.stringify({
          status: "ok",
          records: [{ pmid: "1", pmcid: "PMC9", doi: "10.1/a" }],
        }),
      };
    if (url.pathname.includes("oa.fcgi"))
      return { body: oaXml, contentType: "application/xml" };
    return { body: "PDFBYTES", contentType: "application/octet-stream" }; // binary download
  });
}

describe(McpToolName.FETCH_FULLTEXT, () => {
  it("downloads an OA PDF with sha256 and writes it under outDir", async () => {
    const ctx = makeCtx(fulltextRouter(OA_OK));
    const out = await runFetchFulltext(
      { ids: ["1"], formats: [FulltextFormat.PDF], outDir: dir },
      ctx,
    );
    expect(out.downloaded).toHaveLength(1);
    expect(out.downloaded[0].pmcid).toBe("PMC9");
    expect(out.downloaded[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(out.downloaded[0].license).toBe("CC BY");
    await expect(stat(out.downloaded[0].path)).resolves.toBeTruthy();
  });

  it("withholds download when license is unverified (link only)", async () => {
    const ctx = makeCtx(fulltextRouter(OA_NO_LICENSE));
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.downloaded).toHaveLength(0);
    expect(out.unavailable[0].reason).toBe("LICENSE_UNVERIFIED");
  });

  it("reports a non-OA id as unavailable with links", async () => {
    const ctx = makeCtx(fulltextRouter(OA_NOT_OA));
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.unavailable[0].reason).toBe("NOT_OA");
    expect(out.unavailable[0].links.doi).toBe("10.1/a");
  });
});

describe(McpToolName.AUTH_CHECK, () => {
  it("reports configured + reachable with the db list", async () => {
    const configPath = join(dir, "config.json");
    const credentialsPath = join(dir, "credentials.json");
    await saveConfig({ tool: "t", email: "e@x.com" }, configPath);
    await saveCredentials({ api_key: "KEY" }, credentialsPath);
    const fetch = routeFetch(() => ({
      body: JSON.stringify({
        einforesult: { dblist: ["pubmed", "pmc", "mesh"] },
      }),
    }));

    const out = await runAuthCheck(
      { probeEInfo: true },
      { configPath, credentialsPath, fetchImpl: fetch },
    );
    expect(out.configured).toBe(true);
    expect(out.reachable).toBe(true);
    expect(out.hasApiKey).toBe(true);
    expect(out.rateLimit).toBe(RateLimit.WITH_KEY);
    expect(out.dbList).toContain("pubmed");
  });

  it("reports not configured when config is absent", async () => {
    const out = await runAuthCheck(
      {},
      {
        configPath: join(dir, "missing.json"),
        credentialsPath: join(dir, "none.json"),
      },
    );
    expect(out.configured).toBe(false);
    expect(out.reachable).toBe(false);
    expect(out.rateLimit).toBe(RateLimit.NO_KEY);
  });

  it("skips the EInfo probe when probeEInfo is false", async () => {
    const configPath = join(dir, "config.json");
    await saveConfig({ tool: "t", email: "e@x.com" }, configPath);
    const out = await runAuthCheck(
      { probeEInfo: false },
      { configPath, credentialsPath: join(dir, "none.json") },
    );
    expect(out.configured).toBe(true);
    expect(out.reachable).toBe(false);
  });
});

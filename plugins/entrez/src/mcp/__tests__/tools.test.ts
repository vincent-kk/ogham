import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

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
const OA_TGZ_ONLY = `<OA><records><record id="PMC9" license="CC BY"><link format="tgz" href="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_package/08/e0/PMC9.tar.gz"/></record></records></OA>`;
const OA_PDF_ONLY = `<OA><records><record id="PMC9" license="CC BY"><link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/x.pdf"/></record></records></OA>`;
const OA_NO_LICENSE = `<OA><records><record id="PMC9"><link format="pdf" href="ftp://ftp.ncbi.nlm.nih.gov/pub/x.pdf"/></record></records></OA>`;
const OA_NOT_OA = `<OA><error code="idIsNotOpenAccess">no</error></OA>`;

function buildTgz(files: Record<string, string>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write("0000644\0", 100, 8);
    header.write("0000000\0", 108, 8);
    header.write("0000000\0", 116, 8);
    header.write(data.byteLength.toString(8).padStart(11, "0") + "\0", 124, 12);
    header.write("00000000000\0", 136, 12);
    header.fill(" ", 148, 156);
    header.write("0", 156, 1);
    header.write("ustar\0", 257, 6);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
    blocks.push(header, data);
    const padding = (512 - (data.byteLength % 512)) % 512;
    if (padding) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

function fulltextRouter(oaXml: string, options: { idconvBody?: string } = {}) {
  const requests: string[] = [];
  const fetch = routeFetch((url) => {
    requests.push(url.toString());
    if (url.pathname.includes("idconv"))
      return {
        body:
          options.idconvBody ??
          JSON.stringify({
            status: "ok",
            records: [{ pmid: "1", pmcid: "PMC9", doi: "10.1/a" }],
          }),
      };
    if (url.pathname.includes("oa.fcgi"))
      return { body: oaXml, contentType: "application/xml" };
    return { body: "PDFBYTES", contentType: "application/octet-stream" }; // binary download
  });
  return { fetch, requests };
}

function fulltextTgzRouter(oaXml: string, files: Record<string, string>) {
  const requests: string[] = [];
  return routeFetch((url) => {
    requests.push(url.toString());
    if (url.pathname.includes("idconv"))
      return {
        body: JSON.stringify({
          status: "ok",
          records: [
            {
              pmid: "1",
              pmcid: "PMC9",
              doi: "10.1/a",
              versions: [{ pmcid: "PMC9.1", current: true }],
            },
          ],
        }),
      };
    if (url.pathname.includes("oa.fcgi"))
      return { body: oaXml, contentType: "application/xml" };
    return {
      body: buildTgz(files),
      contentType: "application/gzip",
    };
  });
}

describe(McpToolName.FETCH_FULLTEXT, () => {
  it("downloads an OA PDF with sha256 and writes it under outDir", async () => {
    const { fetch } = fulltextRouter(OA_OK);
    const ctx = makeCtx(fetch);
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

  it("falls back to tgz when the requested PDF link is not offered", async () => {
    const { fetch, requests } = fulltextRouter(OA_TGZ_ONLY);
    const ctx = makeCtx(fetch);
    const out = await runFetchFulltext(
      { ids: ["1"], formats: [FulltextFormat.PDF], outDir: dir },
      ctx,
    );
    expect(out.downloaded[0].format).toBe(FulltextFormat.TAR);
    expect(requests.at(-1)).toContain(
      "https://pmc-oa-opendata.s3.amazonaws.com/deprecated/oa_package/08/e0/PMC9.tar.gz",
    );
  });

  it("extracts requested XML from a tgz fallback when enabled", async () => {
    const ctx = makeCtx(
      fulltextTgzRouter(OA_TGZ_ONLY, { "PMC9.nxml": "<article/>" }),
    );
    const out = await runFetchFulltext(
      {
        ids: ["1"],
        formats: [FulltextFormat.XML],
        outDir: dir,
        extractFromTgz: true,
      } as never,
      ctx,
    );
    expect(out.downloaded[0].format).toBe(FulltextFormat.XML);
    expect(out.downloaded[0].path.endsWith("PMC9.xml")).toBe(true);
    expect(out.unavailable).toHaveLength(0);
  });

  it("reports FORMAT_NOT_OFFERED when neither the format nor tgz is available", async () => {
    const { fetch } = fulltextRouter(OA_PDF_ONLY);
    const ctx = makeCtx(fetch);
    const out = await runFetchFulltext(
      { ids: ["1"], formats: [FulltextFormat.XML], outDir: dir },
      ctx,
    );
    expect(out.unavailable[0].reason).toBe("FORMAT_NOT_OFFERED");
  });

  it("reports IDCONV_MOVED instead of throwing when id conversion fails", async () => {
    const { fetch } = fulltextRouter(OA_OK);
    const ctx = makeCtx(
      routeFetch((url) => {
        if (url.pathname.includes("idconv"))
          return { body: "Moved", status: 301, contentType: "text/plain" };
        return { body: OA_OK, contentType: "application/xml" };
      }),
    );
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.unavailable[0].reason).toBe("IDCONV_MOVED");
    expect(fetch).toBeDefined();
  });

  it("withholds download when license is unverified (link only)", async () => {
    const { fetch } = fulltextRouter(OA_NO_LICENSE);
    const ctx = makeCtx(fetch);
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.downloaded).toHaveLength(0);
    expect(out.unavailable[0].reason).toBe("LICENSE_UNVERIFIED");
  });

  it("reports a non-OA id as unavailable with links", async () => {
    const { fetch } = fulltextRouter(OA_NOT_OA);
    const ctx = makeCtx(fetch);
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.unavailable[0].reason).toBe("NOT_OA");
    expect(out.unavailable[0].links.doi).toBe("10.1/a");
  });

  it("uses a PMC web URL when DOI is absent from fallback links", async () => {
    const { fetch } = fulltextRouter(OA_NOT_OA, {
      idconvBody: JSON.stringify({
        status: "ok",
        records: [{ pmid: "1", pmcid: "PMC9" }],
      }),
    });
    const ctx = makeCtx(fetch);
    const out = await runFetchFulltext({ ids: ["1"], outDir: dir }, ctx);
    expect(out.unavailable[0].links.publisher).toBe(
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC9/",
    );
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

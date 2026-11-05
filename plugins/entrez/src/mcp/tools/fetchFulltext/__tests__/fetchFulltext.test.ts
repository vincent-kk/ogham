import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import {
  NCBI_SERVICE_HOST,
  PMC_SERVICE_HOST,
} from "../../../../constants/defaults.js";
import { EntrezConfigSchema } from "../../../../types/config.js";
import { FulltextFormat, UnavailableReason } from "../../../../types/enums.js";
import type { ToolContext } from "../../../shared/index.js";
import { runFetchFulltext } from "../fetchFulltext.js";

describe("fetchFulltext OA failure isolation", () => {
  it.each(["PMC1", "PMC2"])(
    "reports FETCH_FAILED for %s and downloads the other IDs",
    async (failedPmcid) => {
      const dir = await mkdtemp(join(tmpdir(), "entrez-oa-isolation-"));
      const requested: string[] = [];
      const config = EntrezConfigSchema.parse({
        tool: "entrez-test",
        email: "user@example.com",
      });
      const fetchImpl: typeof fetch = async (input) => {
        const url = new URL(String(input));
        if (url.pathname.includes("idconv"))
          return new Response(
            JSON.stringify({
              status: "ok",
              records: [{ pmid: "1", pmcid: "PMC1", doi: "10.1/a" }],
            }),
          );
        if (url.pathname.includes("oa.fcgi")) {
          const pmcid = url.searchParams.get("id");
          requested.push(pmcid ?? "");
          if (pmcid === failedPmcid)
            return new Response("OA service unavailable", { status: 503 });
          return new Response(
            `<OA><records><record id="${pmcid}" license="CC BY"><link format="pdf" href="https://pmc.ncbi.nlm.nih.gov/${pmcid}.pdf"/></record></records></OA>`,
            { headers: { "content-type": "application/xml" } },
          );
        }
        return new Response("PDFBYTES");
      };
      const ctx: ToolContext = {
        config,
        credentials: {},
        deps: {
          tool: config.tool,
          email: config.email,
          allowedHosts: [NCBI_SERVICE_HOST, PMC_SERVICE_HOST],
          allowPrivateIp: true,
          maxRetries: 0,
          sleep: async () => {},
          fetchImpl,
        },
        baseUrl: config.base_url,
        db: config.default_db,
      };

      try {
        const out = await runFetchFulltext(
          {
            ids: ["1", "PMC2", "PMC3"],
            formats: [FulltextFormat.PDF],
            outDir: dir,
          },
          ctx,
        );
        const successful = ["PMC1", "PMC2", "PMC3"].filter(
          (pmcid) => pmcid !== failedPmcid,
        );
        expect(requested).toEqual(["PMC1", "PMC2", "PMC3"]);
        expect(out.downloaded.map((item) => item.pmcid)).toEqual(successful);
        expect(out.unavailable).toEqual([
          {
            id: failedPmcid === "PMC1" ? "1" : failedPmcid,
            reason: UnavailableReason.FETCH_FAILED,
            links:
              failedPmcid === "PMC1"
                ? { doi: "10.1/a", publisher: undefined }
                : {
                    doi: undefined,
                    publisher: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2/",
                  },
          },
        ]);
        expect((await readdir(dir)).sort()).toEqual(
          successful.map((pmcid) => `${pmcid}.pdf`),
        );
        for (const item of out.downloaded)
          expect(await readFile(item.path, "utf8")).toBe("PDFBYTES");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
});

import { describe, it, expect } from "vitest";

import { esearch } from "../../src/adapters/eutils/esearch.js";
import { Db } from "../../src/types/enums.js";
import {
  EUTILS_HOST,
  NCBI_SERVICE_HOST,
} from "../../src/constants/defaults.js";
import type { HttpDeps } from "../../src/types/http.js";

/**
 * @live smoke — real NCBI calls. Skipped unless RUN_LIVE=1 (see test:live).
 * Guards against E-utilities contract drift (field names, response shape).
 */
const LIVE = process.env.RUN_LIVE === "1";

describe.skipIf(!LIVE)("@live NCBI E-utilities contract", () => {
  const deps: HttpDeps = {
    tool: process.env.ENTREZ_TOOL ?? "entrez-live-smoke",
    email: process.env.ENTREZ_EMAIL ?? "live-smoke@example.com",
    allowedHosts: [EUTILS_HOST, NCBI_SERVICE_HOST],
  };

  it("ESearch returns a count, id list, and query translation", async () => {
    const r = await esearch({ db: Db.PUBMED, term: "crispr", retmax: 5 }, deps);
    expect(r.count).toBeGreaterThan(0);
    expect(r.idList.length).toBeGreaterThan(0);
    expect(typeof r.queryTranslation === "string" || r.queryTranslation === undefined).toBe(true);
  }, 30_000);
});

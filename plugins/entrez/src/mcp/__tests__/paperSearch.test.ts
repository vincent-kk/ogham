import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { runPaperSearch } from "../tools/paperSearch/paperSearch.js";
import { startJob } from "../tools/paperSearch/operations/startJob.js";
import { pollJob } from "../tools/paperSearch/operations/pollJob.js";
import { readJob } from "../tools/paperSearch/operations/readJob.js";
import { FetchMode, JobStatus, QueryRole } from "../../types/enums.js";
import type { PaperSearchInput } from "../../types/tool.js";
import { EntrezConfigSchema } from "../../types/config.js";
import {
  routeFetch,
  makeCtx,
  esearchJson,
  esummaryJson,
} from "./mockEutils.js";

let manifestDir: string;
let jobDir: string;
beforeEach(async () => {
  manifestDir = await mkdtemp(join(tmpdir(), "entrez-mf-"));
  jobDir = await mkdtemp(join(tmpdir(), "entrez-job-"));
});
afterEach(async () => {
  await rm(manifestDir, { recursive: true, force: true });
  await rm(jobDir, { recursive: true, force: true });
});

function twoQueryInput(fetchMode?: FetchMode): PaperSearchInput {
  return {
    queries: [
      { term: "alpha", role: QueryRole.ATM_BROAD },
      { term: "beta", role: QueryRole.MESH_EXPLODED },
    ],
    fetchMode,
  };
}

function unionRouter() {
  return routeFetch((url) => {
    const p = url.pathname;
    const q = url.searchParams;
    if (p.endsWith("esearch.fcgi")) {
      const term = q.get("term") ?? "";
      if (term.includes("alpha"))
        return { body: esearchJson(3, ["1", "2", "3"]) };
      if (term.includes("beta")) return { body: esearchJson(2, ["3", "4"]) };
      return { body: esearchJson(0, []) };
    }
    if (p.endsWith("esummary.fcgi")) {
      const ids = (q.get("id") ?? "").split(",").filter(Boolean);
      return { body: esummaryJson(ids) };
    }
    return { body: "{}" };
  });
}

describe("runPaperSearch", () => {
  it("unions queries with zero loss and accumulates attribution", async () => {
    const ctx = makeCtx(unionRouter(), { manifestDir });
    const out = await runPaperSearch(twoQueryInput(), ctx);

    expect(out.union.total_unique).toBe(4);
    expect(new Set(out.union.records.map((r) => r.pmid))).toEqual(
      new Set(["1", "2", "3", "4"]),
    );
    const pmid3 = out.union.records.find((r) => r.pmid === "3");
    expect(pmid3?.hit_by.sort()).toEqual(["alpha", "beta"]);
    expect(pmid3?.query_role.length).toBe(2);
    expect(out.partial).toBe(false);
  });

  it("enriches records via ESummary (SUMMARY mode)", async () => {
    const ctx = makeCtx(unionRouter(), { manifestDir });
    const out = await runPaperSearch(twoQueryInput(FetchMode.SUMMARY), ctx);
    expect(out.union.records.find((r) => r.pmid === "1")?.title).toBe(
      "Title 1",
    );
    expect(out.reproducibility.fetchedPmidChecksum).toMatch(/^sha256:/);
  });

  it("returns ids-only without fetching metadata", async () => {
    const ctx = makeCtx(unionRouter(), { manifestDir });
    const out = await runPaperSearch(twoQueryInput(FetchMode.IDS_ONLY), ctx);
    expect(out.union.records.every((r) => r.title === "")).toBe(true);
  });

  it("segments an over-cap query and retrieves all UIDs", async () => {
    const fetch = routeFetch((url) => {
      const q = url.searchParams;
      const term = q.get("term") ?? "";
      const retmax = Number(q.get("retmax") ?? "0");
      if (term.includes(" AND (")) {
        return retmax === 0
          ? { body: esearchJson(5000, []) }
          : { body: esearchJson(5000, ["s1", "s2"]) };
      }
      if (term.includes("huge")) return { body: esearchJson(25000, []) };
      if (url.pathname.endsWith("esummary.fcgi")) {
        const ids = (q.get("id") ?? "").split(",").filter(Boolean);
        return { body: esummaryJson(ids) };
      }
      return { body: esearchJson(0, []) };
    });
    const ctx = makeCtx(fetch, { manifestDir });
    const out = await runPaperSearch(
      { queries: [{ term: "huge", role: QueryRole.ATM_BROAD }] },
      ctx,
    );
    expect(out.per_query[0].segmented).toBe(true);
    expect(out.segments.length).toBeGreaterThan(1);
    expect(new Set(out.union.records.map((r) => r.pmid))).toEqual(
      new Set(["s1", "s2"]),
    );
  });

  it("isolates a failed metadata batch (partial recovery)", async () => {
    const fetch = routeFetch((url) => {
      if (url.pathname.endsWith("esearch.fcgi"))
        return { body: esearchJson(2, ["1", "2"]) };
      if (url.pathname.endsWith("esummary.fcgi"))
        return { body: "err", status: 500 };
      return { body: "{}" };
    });
    const ctx = makeCtx(fetch, { manifestDir });
    const out = await runPaperSearch(
      { queries: [{ term: "x", role: QueryRole.ATM_BROAD }] },
      ctx,
    );
    expect(out.partial).toBe(true);
    expect(out.missing_pmids.sort()).toEqual(["1", "2"]);
    expect(out.failed_batches.length).toBe(1);
  });

  it("produces the same checksum for the same input (reproducible)", async () => {
    const a = await runPaperSearch(
      twoQueryInput(),
      makeCtx(unionRouter(), { manifestDir }),
    );
    const b = await runPaperSearch(
      twoQueryInput(),
      makeCtx(unionRouter(), { manifestDir }),
    );
    expect(a.reproducibility.fetchedPmidChecksum).toBe(
      b.reproducibility.fetchedPmidChecksum,
    );
  });

  it("runs as an async job: start (awaited) -> status -> results", async () => {
    const ctx = makeCtx(unionRouter(), { manifestDir });
    const start = await startJob(twoQueryInput(), ctx, {
      dir: jobDir,
      awaitRun: true,
    });
    expect(start.status).toBe(JobStatus.QUEUED);

    const status = await pollJob(start.jobId, { dir: jobDir });
    expect(status.status).toBe(JobStatus.SUCCEEDED);

    const results = await readJob(start.jobId, undefined, { dir: jobDir });
    expect(results.union.total_unique).toBe(4);
  });

  it("applies the configured search window (edat) to a query without dates", async () => {
    const seen: URLSearchParams[] = [];
    const fetch = routeFetch((url) => {
      if (url.pathname.endsWith("esearch.fcgi")) {
        seen.push(url.searchParams);
        return { body: esearchJson(1, ["1"]) };
      }
      if (url.pathname.endsWith("esummary.fcgi"))
        return { body: esummaryJson(["1"]) };
      return { body: "{}" };
    });
    const ctx = makeCtx(fetch, {
      manifestDir,
      config: EntrezConfigSchema.parse({
        tool: "t",
        email: "e@x.com",
        default_window_days: 7,
      }),
    });
    await runPaperSearch(
      { queries: [{ term: "x", role: QueryRole.ATM_BROAD }] },
      ctx,
    );
    // nowMs is fixed to 2023/11/14; a 7-day window looks back to 2023/11/07.
    expect(seen[0].get("datetype")).toBe("edat");
    expect(seen[0].get("mindate")).toBe("2023/11/07");
    expect(seen[0].get("maxdate")).toBe("2023/11/14");
  });

  it("applies no date filter by default, preserving recall", async () => {
    const seen: URLSearchParams[] = [];
    const fetch = routeFetch((url) => {
      if (url.pathname.endsWith("esearch.fcgi")) {
        seen.push(url.searchParams);
        return { body: esearchJson(1, ["1"]) };
      }
      if (url.pathname.endsWith("esummary.fcgi"))
        return { body: esummaryJson(["1"]) };
      return { body: "{}" };
    });
    const ctx = makeCtx(fetch, { manifestDir });
    await runPaperSearch(
      { queries: [{ term: "x", role: QueryRole.ATM_BROAD }] },
      ctx,
    );
    expect(seen[0].get("datetype")).toBeNull();
    expect(seen[0].get("mindate")).toBeNull();
    expect(seen[0].get("maxdate")).toBeNull();
  });
});

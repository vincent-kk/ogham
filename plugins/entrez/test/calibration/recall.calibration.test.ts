import { describe, it, expect } from "vitest";

import { runPaperSearch } from "../../src/mcp/tools/paperSearch/paperSearch.js";
import { FetchMode, QueryRole } from "../../src/types/enums.js";
import {
  routeFetch,
  makeCtx,
  esearchJson,
} from "../../src/mcp/__tests__/mockEutils.js";

/**
 * Recall calibration: a known topic expressed as several queries with
 * overlapping result sets must union to the FULL expected PMID set — zero loss.
 * This pins the recall contract against regression.
 */
describe("@calibration recall — zero loss across a query set", () => {
  // q1 ∪ q2 ∪ q3 = {1..8}; overlaps at 4,5 and 7 must not drop anything.
  const RESULTS: Record<string, string[]> = {
    cancerATM: ["1", "2", "3", "4", "5"],
    cancerMESH: ["4", "5", "6", "7"],
    cancerTIAB: ["7", "8"],
  };
  const EXPECTED = new Set(["1", "2", "3", "4", "5", "6", "7", "8"]);

  function calibrationFetch() {
    return routeFetch((url) => {
      const term = url.searchParams.get("term") ?? "";
      for (const key of Object.keys(RESULTS))
        if (term.includes(key))
          return { body: esearchJson(RESULTS[key].length, RESULTS[key]) };

      return { body: esearchJson(0, []) };
    });
  }

  it("retrieves the entire expected PMID set with no loss", async () => {
    const ctx = makeCtx(calibrationFetch());
    const out = await runPaperSearch(
      {
        queries: [
          { term: "cancerATM", role: QueryRole.ATM_BROAD },
          { term: "cancerMESH", role: QueryRole.MESH_EXPLODED },
          { term: "cancerTIAB", role: QueryRole.TIAB_SYNONYM },
        ],
        fetchMode: FetchMode.IDS_ONLY,
      },
      ctx,
    );

    const got = new Set(out.union.records.map((r) => r.pmid));
    expect(got).toEqual(EXPECTED);
    expect(out.union.total_unique).toBe(EXPECTED.size);
    // Recall = 100%: every expected PMID is present.
    for (const pmid of EXPECTED) expect(got.has(pmid)).toBe(true);
    // Overlap PMIDs accumulated attribution from multiple roles.
    const pmid4 = out.union.records.find((r) => r.pmid === "4");
    expect(pmid4?.query_role.length).toBeGreaterThanOrEqual(2);
  });
});

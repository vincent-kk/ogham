import { describe, it, expect } from "vitest";

import { mergeRecords } from "../operations/mergeRecords.js";
import { dedupKey } from "../operations/dedupKey.js";
import { normalizeTitle } from "../operations/normalizeTitle.js";
import { tagHitBy } from "../operations/tagHitBy.js";
import { QueryRole } from "../../../types/enums.js";
import type { PaperRecord } from "../../../types/record.js";

function rec(p: Partial<PaperRecord> & { pmid?: string; title?: string }): PaperRecord {
  return {
    pmid: p.pmid ?? "",
    doi: p.doi,
    pmcid: p.pmcid,
    title: p.title ?? "Untitled",
    abstract: p.abstract,
    authors: p.authors ?? [],
    journal: p.journal,
    year: p.year,
    mesh: p.mesh,
    hit_by: p.hit_by ?? ["q"],
    query_role: p.query_role ?? [QueryRole.ATM_BROAD],
    expansion_source: p.expansion_source,
  };
}

describe("normalizeTitle / dedupKey", () => {
  it("folds case, punctuation, and whitespace to one key", () => {
    expect(normalizeTitle("A Study: Of  Cancer!")).toBe(
      normalizeTitle("a study of cancer"),
    );
  });

  it("prioritizes PMID over DOI over normalized title", () => {
    expect(dedupKey(rec({ pmid: "1", doi: "10.1/x", title: "t" }))).toBe("pmid:1");
    expect(dedupKey(rec({ pmid: "", doi: "10.1/X", title: "t" }))).toBe("doi:10.1/x");
    expect(dedupKey(rec({ pmid: "", title: "Hello World" }))).toBe(
      "title:helloworld",
    );
  });
});

describe("tagHitBy", () => {
  it("accumulates hit_by/query_role and fills missing fields", () => {
    const base = rec({ pmid: "1", hit_by: ["a"], query_role: [QueryRole.ATM_BROAD] });
    const incoming = rec({
      pmid: "1",
      abstract: "filled",
      hit_by: ["b"],
      query_role: [QueryRole.MESH_EXPLODED],
    });
    const merged = tagHitBy(base, incoming);
    expect(merged.hit_by.sort()).toEqual(["a", "b"]);
    expect(merged.query_role.sort()).toEqual(
      [QueryRole.ATM_BROAD, QueryRole.MESH_EXPLODED].sort(),
    );
    expect(merged.abstract).toBe("filled");
  });
});

describe("mergeRecords — recall (zero loss across queries)", () => {
  it("unions distinct PMIDs from multiple queries without loss", () => {
    // q1: {1,2,3}, q2: {3,4}, q3: {5}  → union {1,2,3,4,5}
    const q1 = ["1", "2", "3"].map((id) => rec({ pmid: id, hit_by: ["q1"] }));
    const q2 = ["3", "4"].map((id) =>
      rec({ pmid: id, hit_by: ["q2"], query_role: [QueryRole.MESH_EXPLODED] }),
    );
    const q3 = [rec({ pmid: "5", hit_by: ["q3"] })];

    const result = mergeRecords([...q1, ...q2, ...q3]);
    expect(result.total_unique).toBe(5);
    expect(new Set(result.records.map((r) => r.pmid))).toEqual(
      new Set(["1", "2", "3", "4", "5"]),
    );
  });

  it("accumulates attribution for records hit by multiple queries", () => {
    const result = mergeRecords([
      rec({ pmid: "3", hit_by: ["q1"], query_role: [QueryRole.ATM_BROAD] }),
      rec({ pmid: "3", hit_by: ["q2"], query_role: [QueryRole.MESH_EXPLODED] }),
    ]);
    expect(result.total_unique).toBe(1);
    expect(result.dedup_collisions).toBe(1);
    expect(result.records[0].hit_by.sort()).toEqual(["q1", "q2"]);
    expect(result.records[0].query_role.sort()).toEqual(
      [QueryRole.ATM_BROAD, QueryRole.MESH_EXPLODED].sort(),
    );
  });

  it("dedups across the PMID/DOI/title key spectrum", () => {
    const result = mergeRecords([
      rec({ pmid: "1", title: "Same Title" }),
      rec({ pmid: "", doi: "10.1/a", title: "x" }),
      rec({ pmid: "", doi: "10.1/A", title: "y" }), // same DOI (case-insensitive)
      rec({ pmid: "", title: "Same Title" }), // title-only dup of #1? no — #1 keyed by pmid
    ]);
    // keys: pmid:1, doi:10.1/a (x merges A), title:sametitle → 3 unique
    expect(result.total_unique).toBe(3);
    expect(result.dedup_collisions).toBe(1);
  });

  it("preserves first-occurrence order", () => {
    const result = mergeRecords([
      rec({ pmid: "9" }),
      rec({ pmid: "1" }),
      rec({ pmid: "9" }),
    ]);
    expect(result.records.map((r) => r.pmid)).toEqual(["9", "1"]);
  });
});

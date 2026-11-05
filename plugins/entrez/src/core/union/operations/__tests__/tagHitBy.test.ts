import { describe, it, expect } from "vitest";

import { QueryRole } from "../../../../types/enums.js";
import type { PaperRecord } from "../../../../types/record.js";
import { tagHitBy } from "../tagHitBy.js";

/** Empty metadata for a duplicate record, including empty optional fields. */
const empty: PaperRecord = {
  pmid: "1",
  doi: "",
  pmcid: "",
  title: "",
  abstract: "",
  authors: [],
  journal: "",
  mesh: [],
  hit_by: ["base"],
  query_role: [QueryRole.ATM_BROAD],
};

/** Populated metadata supplies the missing values without changing identity. */
const full: PaperRecord = {
  pmid: "1",
  doi: "10.1/a",
  pmcid: "PMC1",
  title: "A study",
  abstract: "Study abstract",
  authors: [{ collective: "Study Consortium" }],
  journal: "Study Journal",
  year: 2024,
  mesh: ["Neoplasms"],
  hit_by: ["incoming"],
  query_role: [QueryRole.MESH_EXPLODED],
};

describe("tagHitBy metadata completeness", () => {
  it.each(["doi", "pmcid", "abstract", "journal", "authors", "mesh"] as const)(
    "fills empty %s from the duplicate record",
    (field) => {
      expect(tagHitBy(empty, full)[field]).toEqual(full[field]);
    },
  );

  it("preserves populated metadata and attribution without mutating inputs", () => {
    const before = structuredClone([full, empty]);
    expect(tagHitBy(full, empty)).toEqual({
      ...full,
      hit_by: ["incoming", "base"],
      query_role: [QueryRole.MESH_EXPLODED, QueryRole.ATM_BROAD],
    });
    expect([full, empty]).toEqual(before);
  });

  it("fills absent optional metadata from the duplicate record", () => {
    const base: PaperRecord = {
      pmid: "1",
      title: "",
      authors: [],
      hit_by: [],
      query_role: [],
    };
    expect(tagHitBy(base, full)).toEqual(full);
  });
});

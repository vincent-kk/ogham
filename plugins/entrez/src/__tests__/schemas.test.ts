import { describe, it, expect } from "vitest";

import { PaperRecordSchema } from "../types/record.js";
import { SearchManifestSchema } from "../types/manifest.js";
import { QueryRole, Db, CapStrategy, DateField } from "../types/enums.js";

describe("PaperRecordSchema round-trip", () => {
  const record = {
    pmid: "12345678",
    doi: "10.1/abc",
    pmcid: "PMC1",
    title: "A study",
    abstract: "Background...",
    authors: [
      { lastName: "Doe", foreName: "Jane", initials: "J", orcid: "0000-1" },
      { collective: "The Study Group" },
    ],
    journal: "J Test",
    year: 2024,
    mesh: ["Neoplasms"],
    hit_by: ["cancer[mh]"],
    query_role: [QueryRole.MESH_EXPLODED],
  };

  it("parses a fully structured record", () => {
    const parsed = PaperRecordSchema.parse(record);
    expect(parsed.pmid).toBe("12345678");
    expect(parsed.authors[1].collective).toBe("The Study Group");
    expect(parsed.query_role).toEqual([QueryRole.MESH_EXPLODED]);
  });

  it("requires pmid and title", () => {
    expect(
      PaperRecordSchema.safeParse({ ...record, pmid: undefined }).success,
    ).toBe(false);
  });

  it("rejects an unknown query_role", () => {
    expect(
      PaperRecordSchema.safeParse({ ...record, query_role: ["NOPE"] }).success,
    ).toBe(false);
  });
});

describe("SearchManifestSchema round-trip", () => {
  const manifest = {
    pluginVersion: "0.1.0",
    baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
    db: Db.PUBMED,
    queries: [
      {
        role: QueryRole.ATM_BROAD,
        term: "cancer",
        translation: "neoplasms[mh]",
        count: 100,
        capped: false,
      },
    ],
    counts: { perQuery: { cancer: 100 }, unionUnique: 100 },
    timestamp: "2026-06-26T00:00:00.000Z",
    paging: { retmax: 10000, retstart: 0, batchSize: 200 },
    apiKeyUsed: false,
    fetchedPmidChecksum: "sha256:deadbeef",
    caps: [
      {
        query_role: QueryRole.ATM_BROAD,
        count: 20000,
        strategy: CapStrategy.DATE_SEGMENT,
        segments: 3,
        dateField: DateField.PUBLICATION,
      },
    ],
    warnings: [],
  };

  it("parses a complete manifest", () => {
    const parsed = SearchManifestSchema.parse(manifest);
    expect(parsed.apiKeyUsed).toBe(false);
    expect(parsed.caps[0].strategy).toBe(CapStrategy.DATE_SEGMENT);
  });

  it("never carries an api_key field (boolean usage only)", () => {
    expect("api_key" in manifest).toBe(false);
    expect(typeof manifest.apiKeyUsed).toBe("boolean");
  });

  it("requires fetchedPmidChecksum (primary replay anchor)", () => {
    const { fetchedPmidChecksum: _omit, ...rest } = manifest;
    expect(SearchManifestSchema.safeParse(rest).success).toBe(false);
  });
});

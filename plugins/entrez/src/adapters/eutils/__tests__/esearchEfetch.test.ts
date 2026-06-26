import { describe, it, expect } from "vitest";

import { parseEsearch } from "../esearch.js";
import { parseEfetch } from "../efetch.js";
import { ESEARCH_JSON, EFETCH_XML } from "./fixtures.js";

describe("parseEsearch", () => {
  const r = parseEsearch(ESEARCH_JSON);

  it("extracts count, id list, translation, and history", () => {
    expect(r.count).toBe(1234);
    expect(r.idList).toEqual(["1", "2", "3"]);
    expect(r.queryTranslation).toContain("neoplasms");
    expect(r.webEnv).toBe("MCID_abc");
    expect(r.queryKey).toBe("1");
  });

  it("collects warnings (output messages + phrases not found)", () => {
    expect(r.warnings).toContain("No items found.");
    expect(r.warnings).toContain("xyzzy");
  });

  it("throws a parse error on invalid JSON", () => {
    expect(() => parseEsearch("not json")).toThrow();
  });
});

describe("parseEfetch", () => {
  const records = parseEfetch(EFETCH_XML);

  it("parses every article in the set", () => {
    expect(records).toHaveLength(2);
    expect(records.map((x) => x.pmid)).toEqual(["12345678", "222"]);
  });

  it("structures authors (LastName/ForeName/Initials/ORCID + Collective)", () => {
    const [first] = records;
    expect(first.authors[0]).toMatchObject({
      lastName: "Doe",
      foreName: "Jane",
      initials: "J",
      orcid: "0000-0002-1825-0097",
    });
    expect(first.authors[1].collective).toBe("The Study Consortium");
  });

  it("extracts doi, pmcid, journal, year, and MeSH", () => {
    const [first] = records;
    expect(first.doi).toBe("10.1000/test");
    expect(first.pmcid).toBe("PMC7654321");
    expect(first.journal).toBe("Journal of Testing");
    expect(first.year).toBe(2021);
    expect(first.mesh).toEqual(["Breast Neoplasms", "Genes, BRCA1"]);
  });

  it("keeps inline-markup title text and labeled abstract sections", () => {
    const [first] = records;
    expect(first.title).toContain("Effects of");
    expect(first.title).toContain("BRCA1");
    expect(first.abstract).toContain("BACKGROUND");
    expect(first.abstract).toContain("RESULTS");
  });

  it("derives year from MedlineDate and tolerates missing fields", () => {
    const second = records[1];
    expect(second.year).toBe(2019);
    expect(second.authors).toEqual([]);
    expect(second.mesh).toEqual([]);
    expect(second.abstract).toBeUndefined();
  });

  it("leaves hit_by/query_role empty for the tool to attribute", () => {
    expect(records[0].hit_by).toEqual([]);
    expect(records[0].query_role).toEqual([]);
  });
});

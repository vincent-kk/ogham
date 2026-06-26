import { describe, it, expect } from "vitest";

import { parseEsummary } from "../esummary.js";
import { parseElink } from "../elink.js";
import { parseIdConv } from "../idconv.js";
import { ESUMMARY_JSON, ELINK_JSON, IDCONV_JSON } from "./fixtures.js";

describe("parseEsummary", () => {
  it("maps uids to lightweight records with ids and year", () => {
    const [rec] = parseEsummary(ESUMMARY_JSON);
    expect(rec.pmid).toBe("111");
    expect(rec.title).toBe("Sum title");
    expect(rec.journal).toBe("Nature");
    expect(rec.year).toBe(2020);
    expect(rec.doi).toBe("10.1/x");
    expect(rec.pmcid).toBe("PMC9");
    expect(rec.authorNames).toEqual(["Smith J", "Lee K"]);
  });

  it("returns [] when result is absent", () => {
    expect(parseEsummary(JSON.stringify({}))).toEqual([]);
  });
});

describe("parseElink", () => {
  it("returns linked PMIDs with seeds removed", () => {
    const r = parseElink(ELINK_JSON, "pubmed_pubmed");
    expect(r.seedPmids).toEqual(["111"]);
    expect(r.linkedPmids.sort()).toEqual(["222", "333"]);
  });

  it("returns no links when the linkname does not match", () => {
    const r = parseElink(ELINK_JSON, "pubmed_pmc");
    expect(r.linkedPmids).toEqual([]);
  });
});

describe("parseIdConv", () => {
  it("maps ok and error rows", () => {
    const r = parseIdConv(IDCONV_JSON);
    expect(r.status).toBe("ok");
    expect(r.records[0]).toMatchObject({ pmcid: "PMC1", pmid: "11", doi: "10.1/a" });
    expect(r.records[1]).toMatchObject({ pmid: "99", status: "error" });
  });

  it("throws on invalid JSON", () => {
    expect(() => parseIdConv("<xml/>")).toThrow();
  });
});

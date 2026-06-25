import { describe, it, expect } from "vitest";

import { resolveDb } from "../operations/resolveDb.js";
import { buildBaseUrl } from "../operations/buildBaseUrl.js";
import { Db, EutilFn } from "../../../types/enums.js";
import { DEFAULT_EUTILS_BASE } from "../../../constants/defaults.js";

describe("resolveDb", () => {
  it("defaults to pubmed when unspecified", () => {
    expect(resolveDb()).toBe(Db.PUBMED);
  });

  it("accepts the supported db family", () => {
    expect(resolveDb("pmc")).toBe(Db.PMC);
    expect(resolveDb("mesh")).toBe(Db.MESH);
  });

  it("rejects a non-NCBI db (sibling-plugin scope)", () => {
    expect(() => resolveDb("scholar")).toThrow(/Unknown db/);
  });
});

describe("buildBaseUrl", () => {
  it("joins the default base with <fn>.fcgi", () => {
    expect(buildBaseUrl(EutilFn.ESEARCH)).toBe(
      `${DEFAULT_EUTILS_BASE}esearch.fcgi`,
    );
  });

  it("honors a mirror override and normalizes the trailing slash", () => {
    expect(buildBaseUrl(EutilFn.EFETCH, "https://mirror.example/eutils")).toBe(
      "https://mirror.example/eutils/efetch.fcgi",
    );
  });
});

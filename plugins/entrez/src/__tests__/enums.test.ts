import { describe, it, expect } from "vitest";

import * as enums from "../types/enums.js";
import { Db, QueryRole, CapStrategy, JobStatus, FetchMode, FieldTag } from "../types/enums.js";

/** The 22 canonical enums from PLAN.md + OaStatus (referenced by DownloadedItem). */
const REQUIRED_ENUMS = [
  "Db",
  "SortOrder",
  "DateType",
  "DateField",
  "RecordField",
  "QueryRole",
  "Breadth",
  "MeshMatch",
  "FulltextFormat",
  "UnavailableReason",
  "RateLimit",
  "EutilFn",
  "RetMode",
  "HttpMethod",
  "FieldTag",
  "FetchMode",
  "CapStrategy",
  "JobStatus",
  "ExpansionSource",
  "IntentType",
  "ExecutionMode",
  "ErrorCode",
  "OaStatus",
] as const;

describe("enums catalog", () => {
  it("exports every required enum as a non-empty object", () => {
    for (const name of REQUIRED_ENUMS) {
      const value = (enums as Record<string, unknown>)[name];
      expect(value, `${name} must be exported`).toBeTypeOf("object");
      expect(Object.keys(value as object).length).toBeGreaterThan(0);
    }
  });

  it("QueryRole has the 6 recall-spectrum roles", () => {
    expect(Object.values(QueryRole)).toEqual([
      "ATM_BROAD",
      "MESH_EXPLODED",
      "MESH_NOEXP",
      "TIAB_SYNONYM",
      "ALL_FIELDS",
      "SIMILAR",
    ]);
  });

  it("Db is limited to the single NCBI db family", () => {
    expect(Object.values(Db)).toEqual(["pubmed", "pmc", "mesh"]);
  });

  it("CapStrategy covers warn/segment/abort", () => {
    expect(Object.values(CapStrategy)).toEqual(["WARN", "DATE_SEGMENT", "ABORT"]);
  });

  it("JobStatus includes partial + cancelled (async surface)", () => {
    expect(Object.values(JobStatus)).toContain("partial");
    expect(Object.values(JobStatus)).toContain("cancelled");
  });

  it("FetchMode ladders from ids-only to full", () => {
    expect(Object.values(FetchMode)).toEqual([
      "IDS_ONLY",
      "SUMMARY",
      "ABSTRACTS",
      "FULL",
    ]);
  });

  it("FieldTag keeps mh:noexp distinct from mh (explosion control)", () => {
    expect(FieldTag.MESH).toBe("mh");
    expect(FieldTag.MESH_NOEXP).toBe("mh:noexp");
  });
});

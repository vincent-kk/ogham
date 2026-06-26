import { describe, it, expect } from "vitest";

import { parseEspell } from "../espell.js";
import { parseOa } from "../oaService.js";
import { OaStatus } from "../../../types/enums.js";
import {
  ESPELL_XML,
  ESPELL_XML_NO_CORRECTION,
  OA_XML,
  OA_XML_NOT_OA,
} from "./fixtures.js";

describe("parseEspell", () => {
  it("returns the corrected query", () => {
    expect(parseEspell(ESPELL_XML)).toBe("asthma");
  });

  it("returns empty string when there is no correction", () => {
    expect(parseEspell(ESPELL_XML_NO_CORRECTION)).toBe("");
  });
});

describe("parseOa", () => {
  it("parses an open-access record with license and format links", () => {
    const oa = parseOa(OA_XML, "PMC13900");
    expect(oa.oaStatus).toBe(OaStatus.OPEN_ACCESS);
    expect(oa.license).toBe("CC BY");
    expect(oa.pmcid).toBe("PMC13900");
    const formats = oa.formats.map((f) => f.format).sort();
    expect(formats).toEqual(["pdf", "tgz"]);
    expect(oa.formats.every((f) => f.href.startsWith("ftp://"))).toBe(true);
  });

  it("marks a non-OA identifier with the error code", () => {
    const oa = parseOa(OA_XML_NOT_OA, "PMC1");
    expect(oa.oaStatus).toBe(OaStatus.NOT_OPEN_ACCESS);
    expect(oa.errorCode).toBe("idIsNotOpenAccess");
    expect(oa.formats).toEqual([]);
  });

  it("reports UNKNOWN when no record and no error are present", () => {
    const oa = parseOa("<OA><records/></OA>", "PMC2");
    expect(oa.oaStatus).toBe(OaStatus.UNKNOWN);
  });
});

import { describe, expect, it } from "vitest";

import { Encoding } from "../../../types/enums.js";
import { decodeOutput } from "../operations/decodeOutput.js";

describe("decodeOutput", () => {
  it("decodes valid UTF-8", () => {
    const out = decodeOutput(Buffer.from("정규성 검정 p=0.03", "utf8"));
    expect(out.text).toBe("정규성 검정 p=0.03");
    expect(out.encodingUsed).toBe(Encoding.Utf8);
    expect(out.truncated).toBe(false);
  });

  it("falls back to CP949/EUC-KR for non-UTF-8 Korean bytes", () => {
    // "한글" encoded as EUC-KR (UHC/CP949): 0xC7 0xD1 0xB1 0xDB
    const out = decodeOutput(Buffer.from([0xc7, 0xd1, 0xb1, 0xdb]));
    expect(out.text).toBe("한글");
    expect(out.encodingUsed).toBe(Encoding.Cp949);
  });

  it("decodes plain ASCII as UTF-8", () => {
    const out = decodeOutput(Buffer.from("Estimate Std.Error", "ascii"));
    expect(out.encodingUsed).toBe(Encoding.Utf8);
    expect(out.text).toContain("Estimate");
  });
});

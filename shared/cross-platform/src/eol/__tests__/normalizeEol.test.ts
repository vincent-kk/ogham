import { describe, expect, it } from "vitest";
import { normalizeEol } from "../normalizeEol.js";

describe("normalizeEol", () => {
  it("converts CRLF to LF", () => {
    expect(normalizeEol("a\r\nb\r\nc")).toBe("a\nb\nc");
  });

  it("strips leading BOM", () => {
    expect(normalizeEol("﻿hello")).toBe("hello");
  });

  it("preserves bare LF and bare CR mid-string", () => {
    expect(normalizeEol("a\nb")).toBe("a\nb");
    expect(normalizeEol("a\rb")).toBe("a\rb");
  });

  it("handles empty input", () => {
    expect(normalizeEol("")).toBe("");
  });

  it("handles BOM followed by CRLF together", () => {
    expect(normalizeEol("﻿a\r\nb\r\n")).toBe("a\nb\n");
  });
});

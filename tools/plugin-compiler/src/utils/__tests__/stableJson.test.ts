import { describe, expect, it } from "vitest";

import { stableJson } from "../stableJson.js";

describe("stableJson", () => {
  // --- basic ---

  it("indents with two spaces", () => {
    expect(stableJson({ a: 1 })).toBe('{\n  "a": 1\n}\n');
  });

  it("terminates with a newline", () => {
    expect(stableJson({}).endsWith("\n")).toBe(true);
  });

  it("serializes nested structures", () => {
    expect(stableJson({ a: { b: [1] } })).toBe(
      '{\n  "a": {\n    "b": [\n      1\n    ]\n  }\n}\n',
    );
  });

  // --- complex ---

  it("is byte-identical across repeated calls", () => {
    const value = { name: "filid", plugins: [{ path: "./plugins/filid" }] };
    expect(stableJson(value)).toBe(stableJson(value));
  });

  it("preserves insertion order of keys", () => {
    expect(stableJson({ b: 1, a: 2 })).toBe('{\n  "b": 1,\n  "a": 2\n}\n');
  });
});

import { describe, it, expect } from "vitest";
import { normalizeBody } from "../normalizeBody.js";

describe("normalizeBody", () => {
  describe("basic", () => {
    it("parses a JSON-object string into an object", () => {
      expect(normalizeBody('{"fields":{"summary":"x"}}')).toEqual({
        fields: { summary: "x" },
      });
    });

    it("passes an object body through unchanged", () => {
      const obj = { fields: { summary: "x" } };
      expect(normalizeBody(obj)).toBe(obj);
    });

    it("passes undefined through unchanged", () => {
      expect(normalizeBody(undefined)).toBeUndefined();
    });
  });

  describe("edge", () => {
    it("parses a JSON-array string into an array", () => {
      expect(normalizeBody("[1,2]")).toEqual([1, 2]);
    });

    it("leaves a non-JSON string unchanged (e.g. markdown)", () => {
      expect(normalizeBody("# heading")).toBe("# heading");
    });

    it("leaves a JSON primitive string unchanged (no coercion)", () => {
      expect(normalizeBody("123")).toBe("123");
      expect(normalizeBody('"quoted"')).toBe('"quoted"');
    });

    it("leaves malformed JSON unchanged", () => {
      expect(normalizeBody('{"a":')).toBe('{"a":');
    });

    it("passes null through unchanged", () => {
      expect(normalizeBody(null)).toBeNull();
    });
  });
});

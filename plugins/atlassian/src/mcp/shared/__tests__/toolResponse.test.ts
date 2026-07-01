import { describe, it, expect } from "vitest";
import { wrapHandler, toolError } from "../toolResponse.js";

type ToolResponse = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

describe("toolResponse", () => {
  describe("basic", () => {
    it("wraps a successful result", async () => {
      const handler = wrapHandler(async () => ({ ok: true }));
      const res = (await handler({})) as ToolResponse;
      expect(res.isError).toBeUndefined();
      expect(res.content[0].text).toContain('"ok": true');
    });

    it("wraps a thrown error with isError", async () => {
      const handler = wrapHandler(async () => {
        throw new Error("boom");
      });
      const res = (await handler({})) as ToolResponse;
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain("boom");
    });
  });

  describe("edge", () => {
    it("surfaces structured error.details", () => {
      const err = Object.assign(new Error("HTTP 400"), {
        details: { errorMessages: ["field 'x' is required"] },
      });
      const res = toolError(err) as ToolResponse;
      expect(res.content[0].text).toContain("HTTP 400");
      expect(res.content[0].text).toContain("field 'x' is required");
    });

    it("surfaces error.cause when present", () => {
      const err = new Error("wrapper", { cause: { code: "EAI_AGAIN" } });
      const res = toolError(err) as ToolResponse;
      expect(res.content[0].text).toContain("EAI_AGAIN");
    });

    it("falls back to plain message when no details", () => {
      const res = toolError(new Error("plain")) as ToolResponse;
      expect(res.content[0].text).toBe("Error: plain");
    });
  });
});

import { describe, expect, it } from "vitest";

import { parseApplyPatch } from "../parseApplyPatch.js";

describe("parseApplyPatch hunk provenance", () => {
  it("preserves headers, prefixes, context, and order across update hunks", () => {
    const parsed = parseApplyPatch(
      "*** Begin Patch\n*** Update File: src/value.ts\n@@ function first()\n before\n-old\n+new\n@@\n keep\n\n-}\n+}\n*** End Patch",
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.operations[0].hunks).toEqual([
      {
        header: "function first()",
        lines: [
          { prefix: " ", text: "before" },
          { prefix: "-", text: "old" },
          { prefix: "+", text: "new" },
        ],
      },
      {
        header: "",
        lines: [
          { prefix: " ", text: "keep" },
          { prefix: " ", text: "" },
          { prefix: "-", text: "}" },
          { prefix: "+", text: "}" },
        ],
      },
    ]);
  });
});

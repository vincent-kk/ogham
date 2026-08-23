import { describe, expect, it } from "vitest";

import { projectApplyPatchHunks } from "../hunkProjection/projectApplyPatchHunks.js";

describe("projectApplyPatchHunks", () => {
  it("uses surrounding context to identify an otherwise repeated brace", () => {
    const current =
      "function first() {\n  return 1;\n}\nfunction target() {\n  return 2;\n}\n";

    expect(
      projectApplyPatchHunks(current, [
        {
          header: "",
          lines: [
            { prefix: " ", text: "function target() {" },
            { prefix: " ", text: "  return 2;" },
            { prefix: "-", text: "}" },
            { prefix: "+", text: "}" },
          ],
        },
      ]),
    ).toEqual({ kind: "exact", content: current });
  });

  it("narrows matching to the first line containing a non-empty header", () => {
    expect(
      projectApplyPatchHunks(
        "const value = 1;\nfunction second() {\nconst value = 1;\n}\n",
        [
          {
            header: "function second()",
            lines: [
              { prefix: "-", text: "const value = 1;" },
              { prefix: "+", text: "const value = 2;" },
            ],
          },
        ],
      ),
    ).toEqual({
      kind: "exact",
      content: "const value = 1;\nfunction second() {\nconst value = 2;\n}\n",
    });
  });

  it("applies two hunks sequentially after each replaced region", () => {
    expect(
      projectApplyPatchHunks("alpha old\nmiddle\nbeta old\n", [
        {
          header: "",
          lines: [
            { prefix: "-", text: "alpha old" },
            { prefix: "+", text: "alpha new" },
          ],
        },
        {
          header: "",
          lines: [
            { prefix: "-", text: "beta old" },
            { prefix: "+", text: "beta new" },
          ],
        },
      ]),
    ).toEqual({
      kind: "exact",
      content: "alpha new\nmiddle\nbeta new\n",
    });
  });

  it("reports an ambiguous hunk when context and removal repeat", () => {
    expect(
      projectApplyPatchHunks("before\nold\nafter\nbefore\nold\nafter\n", [
        {
          header: "",
          lines: [
            { prefix: " ", text: "before" },
            { prefix: "-", text: "old" },
            { prefix: "+", text: "new" },
            { prefix: " ", text: "after" },
          ],
        },
      ]),
    ).toEqual({ kind: "ambiguous", hunkIndex: 0 });
  });

  it("reports a stale source when a removed line is absent", () => {
    expect(
      projectApplyPatchHunks("present\n", [
        {
          header: "",
          lines: [
            { prefix: "-", text: "missing" },
            { prefix: "+", text: "replacement" },
          ],
        },
      ]),
    ).toEqual({ kind: "stale-source", hunkIndex: 0 });
  });
});

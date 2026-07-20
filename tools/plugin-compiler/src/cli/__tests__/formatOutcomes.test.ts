import { describe, expect, it } from "vitest";

import { formatOutcomes } from "../format/formatOutcomes.js";

const ROOT = "/repo";

describe("formatOutcomes", () => {
  // --- basic ---

  it("reports no targets for an empty plan", () => {
    expect(formatOutcomes([], ROOT)).toBe("✓ sync: no targets\n");
  });

  it("summarizes unchanged files without listing them", () => {
    const report = formatOutcomes(
      [{ absolutePath: "/repo/plugins/a/x.json", action: "unchanged" }],
      ROOT,
    );
    expect(report).toBe("✓ sync: 1 unchanged\n");
  });

  it("lists a written file with a repository-relative path", () => {
    const report = formatOutcomes(
      [{ absolutePath: "/repo/plugins/a/x.json", action: "created" }],
      ROOT,
    );
    expect(report).toBe("created   plugins/a/x.json\n✓ sync: 1 created\n");
  });

  // --- complex ---

  it("pads the action column so paths line up", () => {
    const report = formatOutcomes(
      [{ absolutePath: "/repo/x.json", action: "stale" }],
      ROOT,
    );
    expect(report.startsWith("stale     x.json")).toBe(true);
  });

  it("counts each action separately in the summary", () => {
    const report = formatOutcomes(
      [
        { absolutePath: "/repo/a.json", action: "created" },
        { absolutePath: "/repo/b.json", action: "updated" },
        { absolutePath: "/repo/c.json", action: "unchanged" },
      ],
      ROOT,
    );
    expect(report.trimEnd().split("\n").at(-1)).toBe(
      "✓ sync: 1 created, 1 updated, 1 unchanged",
    );
  });

  it("lists drift entries in check mode", () => {
    const report = formatOutcomes(
      [
        { absolutePath: "/repo/a.json", action: "stale" },
        { absolutePath: "/repo/b.json", action: "missing" },
      ],
      ROOT,
    );
    expect(report).toContain("stale     a.json\n");
    expect(report).toContain("missing   b.json\n");
  });
});

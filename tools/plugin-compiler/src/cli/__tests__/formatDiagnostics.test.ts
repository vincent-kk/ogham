import { describe, expect, it } from "vitest";

import { formatDiagnostics } from "../format/formatDiagnostics.js";

describe("formatDiagnostics", () => {
  // --- basic ---

  it("returns an empty string when there is nothing to report", () => {
    expect(formatDiagnostics([])).toBe("");
  });

  it("prefixes a warning with the warning glyph", () => {
    expect(
      formatDiagnostics([
        { level: "warning", code: "codex-read-matcher", message: "m" },
      ]),
    ).toBe("⚠ codex-read-matcher: m\n");
  });

  it("prefixes an error with the error glyph", () => {
    expect(
      formatDiagnostics([
        { level: "error", code: "mcp-variable-args", message: "m" },
      ]),
    ).toBe("✗ mcp-variable-args: m\n");
  });

  // --- complex ---

  it("emits one newline-terminated line per diagnostic", () => {
    const report = formatDiagnostics([
      { level: "warning", code: "a", message: "one" },
      { level: "error", code: "b", message: "two" },
    ]);
    expect(report).toBe("⚠ a: one\n✗ b: two\n");
  });
});

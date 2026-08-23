import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("../../..", import.meta.url));

function readReference(name: string): string {
  return readFileSync(
    join(packageRoot, "skills", "setup", "references", name),
    "utf8",
  );
}

describe("setup managed library instructions", () => {
  it("uses the structured run_r path instead of Claude state variables", () => {
    const references = `${readReference("packages.md")}\n${readReference("windows.md")}`;
    expect(references).toContain("managedLibraryPath");
    expect(references).toContain("R_STATISTICS_LIB");
    expect(references).not.toContain("CLAUDE_CONFIG_DIR");
    expect(references).not.toContain("~/.claude");
  });

  it("documents safe POSIX quoting for spaces and apostrophes", () => {
    expect(readReference("packages.md")).toContain(
      `R_STATISTICS_LIB='/tmp/R lib/owner'"'"'s'`,
    );
  });

  it("documents safe PowerShell quoting for spaces and apostrophes", () => {
    expect(readReference("windows.md")).toContain(
      `$env:R_STATISTICS_LIB = 'C:\\R Lib\\Owner''s'`,
    );
  });

  it("re-verifies through run_r without changing the captured path", () => {
    const packages = readReference("packages.md");
    expect(packages).toContain("same `managedLibraryPath`");
    expect(packages).toContain("Step 6");
  });
});

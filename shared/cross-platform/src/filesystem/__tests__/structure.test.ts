import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MODULE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("filesystem source structure", () => {
  it("declares at most one function per production file", () => {
    const pending = [MODULE_ROOT];
    const violations: string[] = [];

    while (pending.length > 0) {
      const directory = pending.pop();
      if (directory === undefined) break;

      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === "__tests__" || entry.name === "types") continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          pending.push(path);
          continue;
        }
        if (!entry.name.endsWith(".ts") || entry.name === "index.ts") continue;

        const declarations =
          readFileSync(path, "utf8").match(
            /^(?:export\s+)?(?:async\s+)?function\s+\w+/gm,
          ) ?? [];
        if (declarations.length > 1)
          violations.push(
            `${path.slice(MODULE_ROOT.length + 1)}: ${declarations.length}`,
          );
      }
    }

    expect(violations).toEqual([]);
  });
});

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/** Canonical settings page sources, including offline mocks and styles. */
const settingsDir = join(import.meta.dirname, "..");

it("keeps every settings source file below 500 lines", () => {
  const files = readdirSync(settingsDir, {
    recursive: true,
    encoding: "utf8",
  }).filter(
    (file) =>
      !file.split(/[\\/]/).includes("__tests__") &&
      statSync(join(settingsDir, file)).isFile(),
  );
  for (const file of files) {
    const lines = readFileSync(join(settingsDir, file), "utf8")
      .trimEnd()
      .split("\n");
    expect(lines.length, file).toBeLessThan(500);
  }
});

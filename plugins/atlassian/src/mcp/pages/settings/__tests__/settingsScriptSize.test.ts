import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/** Canonical browser scripts loaded by the settings page. */
const scripts = join(import.meta.dirname, "../scripts");

it("keeps every settings browser script below 500 lines", () => {
  const files = readdirSync(scripts, {
    recursive: true,
    encoding: "utf8",
  }).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const lines = readFileSync(join(scripts, file), "utf8")
      .trimEnd()
      .split("\n");
    expect(lines.length, file).toBeLessThan(500);
  }
});

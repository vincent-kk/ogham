import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runHookEntry } from "../bootstrap.js";

const fixturesDir = resolve(fileURLToPath(new URL("./fixtures/", import.meta.url)));
function fixture(name: string): string {
  return resolve(fixturesDir, name);
}

describe("runHookEntry", () => {
  it("returns 1 when target file does not exist", async () => {
    expect(await runHookEntry(fixture("does-not-exist.mjs"), [])).toBe(1);
  });

  it("executes a valid target and returns exit 0", async () => {
    expect(await runHookEntry(fixture("hook-ok.mjs"), [])).toBe(0);
  });

  it("propagates non-zero exit code", async () => {
    expect(await runHookEntry(fixture("hook-fail.mjs"), [])).toBe(42);
  });

  it("forwards argv to the child", async () => {
    expect(await runHookEntry(fixture("hook-argv.mjs"), ["arg1", "arg2"])).toBe(0);
  });
});

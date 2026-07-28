import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLauncher } from "../resolveLauncher.js";
import { spawnCli } from "../spawnCli.js";

vi.mock("../resolveLauncher.js", () => ({ resolveLauncher: vi.fn() }));

const fixturesDir = resolve(
  fileURLToPath(new URL("./fixtures/", import.meta.url)),
);
const node = process.execPath;
const mockLauncher = vi.mocked(resolveLauncher);

function fixture(name: string): string {
  return resolve(fixturesDir, name);
}

beforeEach(() => {
  mockLauncher.mockReturnValue(null);
});

describe("spawnCli output cap", () => {
  // A provider stream carries its answer in the last events, so the cap drops the
  // head and says so — an unbounded run under a multi-hour ceiling is what reaches
  // the V8 string limit inside a stdout listener, where the throw kills the process.
  it("keeps the tail and marks the drop when maxOutputChars is set", async () => {
    const result = await spawnCli(node, [fixture("flood-stdout.mjs")], {
      maxOutputChars: 5000,
    });
    expect(result.code).toBe(0);
    expect(result.stdout.length).toBeLessThanOrEqual(5100);
    expect(result.stdout).toContain("line-9");
    expect(result.stdout).not.toContain("line-0");
    expect(result.stdout).toContain("earlier output dropped");
  }, 15_000);

  it("keeps every byte when no cap is given", async () => {
    const result = await spawnCli(node, [fixture("flood-stdout.mjs")]);
    expect(result.stdout.length).toBeGreaterThan(39_000);
    expect(result.stdout).toContain("line-0");
    expect(result.stdout).toContain("line-9");
    expect(result.stdout).not.toContain("earlier output dropped");
  }, 15_000);
});

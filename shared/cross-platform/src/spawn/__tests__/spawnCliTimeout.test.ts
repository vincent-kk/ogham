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

describe("spawnCli timeouts", () => {
  it("reports timedOut when the child exceeds timeoutMs", async () => {
    const result = await spawnCli(node, [fixture("long-sleep.mjs")], {
      timeoutMs: 100,
    });
    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("wall");
  }, 15_000);

  // The child lives 3 s and emits every 150 ms, so a 1.5 s idle limit can only be
  // survived by resetting it on output — startup cannot eat the budget, and
  // `scaleWindowsTimeout: false` keeps it identical on Windows, where a 5 s floor
  // would make this pass without any reset at all.
  it("keeps a child alive past idleTimeoutMs while it keeps emitting", async () => {
    const result = await spawnCli(node, [fixture("heartbeat.mjs")], {
      idleTimeoutMs: 1500,
      scaleWindowsTimeout: false,
    });
    expect(result.timedOut).toBe(false);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("tick");
  }, 15_000);

  it("reports an idle timeout when the child stops emitting", async () => {
    const result = await spawnCli(node, [fixture("long-sleep.mjs")], {
      idleTimeoutMs: 300,
    });
    expect(result.timedOut).toBe(true);
    expect(result.timeoutKind).toBe("idle");
  }, 15_000);
});

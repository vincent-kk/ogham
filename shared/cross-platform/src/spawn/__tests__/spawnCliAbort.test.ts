import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

describe("spawnCli abort", () => {
  it("aborts the child when onStderr returns true", async () => {
    const result = await spawnCli(node, [fixture("stderr-then-hang.mjs")], {
      timeoutMs: 10_000,
      onStderr: (_chunk, accumulated) =>
        (accumulated.match(/retry/g)?.length ?? 0) >= 2,
    });
    expect(result.abortedByCaller).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stderr).toContain("retry");
  }, 15_000);

  // The idle limit is shorter than the settle delay an abort schedules, so an idle
  // timer left armed fires while the abort is still settling and relabels the
  // result — `rate_limit` for a retry storm becomes a network timeout.
  it.skipIf(process.platform === "win32")(
    "does not report an idle timeout for a run the caller aborted (POSIX)",
    async () => {
      const result = await spawnCli(
        node,
        [fixture("stderr-then-hang-with-heir.mjs")],
        {
          idleTimeoutMs: 200,
          scaleWindowsTimeout: false,
          onStderr: () => true,
        },
      );
      expect(result.abortedByCaller).toBe(true);
      expect(result.timedOut).toBe(false);
      expect(result.timeoutKind).toBeUndefined();
    },
    15_000,
  );

  it("leaves abortedByCaller false on a normal exit", async () => {
    const result = await spawnCli(node, [fixture("print-stderr.mjs"), "oops"], {
      onStderr: () => false,
    });
    expect(result.abortedByCaller).toBe(false);
    expect(result.stderr).toBe("oops");
  });

  it.skipIf(process.platform === "win32")(
    "group-kills grandchildren on abort when detached (POSIX)",
    async () => {
      const pidFile = resolve(
        tmpdir(),
        `omc-gc-${process.pid}-${Math.random().toString(36).slice(2)}.pid`,
      );
      const controller = new AbortController();
      const promise = spawnCli(
        node,
        [fixture("spawn-grandchild.mjs"), pidFile],
        { detached: true, signal: controller.signal },
      );
      while (!existsSync(pidFile)) await new Promise((r) => setTimeout(r, 20));

      const gcPid = Number(readFileSync(pidFile, "utf8"));
      controller.abort();
      const result = await promise;
      expect(result.abortedByCaller).toBe(true);

      let alive = true;
      for (let i = 0; i < 50 && alive; i += 1)
        try {
          process.kill(gcPid, 0);
          await new Promise((r) => setTimeout(r, 40));
        } catch {
          alive = false;
        }

      // cleanup so a regression never leaves an orphan behind in CI
      try {
        process.kill(gcPid, "SIGKILL");
      } catch {
        /* already reaped */
      }
      expect(alive).toBe(false);
    },
    15_000,
  );
});

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

describe("spawnCli", () => {
  it("captures stdout from a fixture script", async () => {
    const result = await spawnCli(node, [fixture("print-hello.mjs")]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("hello\n");
    expect(result.stderr).toBe("");
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBeUndefined();
  });

  it("returns the actual exit code", async () => {
    const result = await spawnCli(node, [fixture("exit-with-code.mjs"), "7"]);
    expect(result.code).toBe(7);
  });

  it("captures stderr separately from stdout", async () => {
    const result = await spawnCli(node, [fixture("print-stderr.mjs"), "oops"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("oops");
  });

  it("normalises CRLF to LF in stdout by default", async () => {
    const result = await spawnCli(node, [fixture("print-crlf.mjs")]);
    expect(result.stdout).toBe("line1\nline2\n");
  });

  it("preserves CRLF when normalizeEol: false", async () => {
    const result = await spawnCli(node, [fixture("print-crlf.mjs")], {
      normalizeEol: false,
    });
    expect(result.stdout).toBe("line1\r\nline2\r\n");
  });

  it("forwards stdin via options.input", async () => {
    const result = await spawnCli(node, [fixture("echo-stdin.mjs")], {
      input: "ping",
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("ping");
  });

  it("reports timedOut when the child exceeds timeoutMs", async () => {
    const result = await spawnCli(node, [fixture("long-sleep.mjs")], {
      timeoutMs: 100,
    });
    expect(result.timedOut).toBe(true);
  }, 15_000);

  it("returns spawnError or non-zero code for an unknown binary", async () => {
    const result = await spawnCli("non-existent-binary-xyz", []);
    const failed =
      result.spawnError !== undefined ||
      (result.code !== 0 && result.code !== null);
    expect(failed).toBe(true);
  });

  it("routes through a launcher and preserves multi-line arguments", async () => {
    mockLauncher.mockReturnValue({
      command: node,
      prependArgs: [fixture("echo-argv.mjs")],
    });
    const multiline =
      "<recency_policy>\nToday: 2026-06-07.\n</recency_policy>\n\nsummarise https://x?v=1";
    const result = await spawnCli("gemini", [multiline]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(multiline);
  });

  it("prepends launcher args before the caller args", async () => {
    mockLauncher.mockReturnValue({
      command: node,
      prependArgs: [fixture("echo-argv.mjs")],
    });
    const result = await spawnCli("gemini", ["just-one-line"]);
    expect(result.stdout).toBe("just-one-line");
  });

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

  it("leaves abortedByCaller false on a normal exit", async () => {
    const result = await spawnCli(node, [fixture("print-stderr.mjs"), "oops"], {
      onStderr: () => false,
    });
    expect(result.abortedByCaller).toBe(false);
    expect(result.stderr).toBe("oops");
  });

  it("captures output normally when detached", async () => {
    const result = await spawnCli(node, [fixture("print-hello.mjs")], {
      detached: true,
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("hello\n");
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

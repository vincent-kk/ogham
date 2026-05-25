import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { spawnCli } from "../spawn-cli.js";

const fixturesDir = resolve(
  fileURLToPath(new URL("./fixtures/", import.meta.url)),
);
const node = process.execPath;

function fixture(name: string): string {
  return resolve(fixturesDir, name);
}

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

  it(
    "reports timedOut when the child exceeds timeoutMs",
    async () => {
      const result = await spawnCli(node, [fixture("long-sleep.mjs")], {
        timeoutMs: 100,
      });
      expect(result.timedOut).toBe(true);
    },
    15_000,
  );

  it("returns spawnError or non-zero code for an unknown binary", async () => {
    const result = await spawnCli("non-existent-binary-xyz", []);
    const failed =
      result.spawnError !== undefined ||
      (result.code !== 0 && result.code !== null);
    expect(failed).toBe(true);
  });
});

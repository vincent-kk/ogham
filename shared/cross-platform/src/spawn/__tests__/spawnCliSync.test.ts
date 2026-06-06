import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveLauncher } from "../resolveLauncher.js";
import { spawnCliSync } from "../spawnCliSync.js";

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

describe("spawnCliSync", () => {
  it("captures stdout from a fixture script", () => {
    const result = spawnCliSync(node, [fixture("print-hello.mjs")]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("hello\n");
    expect(result.stderr).toBe("");
    expect(result.timedOut).toBe(false);
    expect(result.spawnError).toBeUndefined();
  });

  it("returns the actual exit code", () => {
    const result = spawnCliSync(node, [fixture("exit-with-code.mjs"), "7"]);
    expect(result.code).toBe(7);
  });

  it("captures stderr separately from stdout", () => {
    const result = spawnCliSync(node, [fixture("print-stderr.mjs"), "oops"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("oops");
  });

  it("normalises CRLF to LF in stdout by default", () => {
    const result = spawnCliSync(node, [fixture("print-crlf.mjs")]);
    expect(result.stdout).toBe("line1\nline2\n");
  });

  it("preserves CRLF when normalizeEol: false", () => {
    const result = spawnCliSync(node, [fixture("print-crlf.mjs")], {
      normalizeEol: false,
    });
    expect(result.stdout).toBe("line1\r\nline2\r\n");
  });

  it("forwards stdin via options.input", () => {
    const result = spawnCliSync(node, [fixture("echo-stdin.mjs")], {
      input: "ping",
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toBe("ping");
  });

  it("returns spawnError or non-zero code for an unknown binary", () => {
    const result = spawnCliSync("non-existent-binary-xyz", []);
    const failed =
      result.spawnError !== undefined ||
      (result.code !== 0 && result.code !== null);
    expect(failed).toBe(true);
  });

  it("routes through a launcher and preserves multi-line arguments", () => {
    mockLauncher.mockReturnValue({
      command: node,
      prependArgs: [fixture("echo-argv.mjs")],
    });
    const multiline = "line-1\nline-2\n\nline-4";
    const result = spawnCliSync("gemini", [multiline]);
    expect(result.code).toBe(0);
    expect(result.stdout).toBe(multiline);
  });

  it("prepends launcher args before the caller args", () => {
    mockLauncher.mockReturnValue({
      command: node,
      prependArgs: [fixture("echo-argv.mjs")],
    });
    const result = spawnCliSync("gemini", ["just-one-line"]);
    expect(result.stdout).toBe("just-one-line");
  });
});

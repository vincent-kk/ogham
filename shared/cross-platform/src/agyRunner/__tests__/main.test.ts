import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Source entry point executed through the repository's installed tsx loader. */
const runner = fileURLToPath(new URL("../main.ts", import.meta.url));
/** Isolated handler fixtures removed after the runner subprocesses exit. */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "agy-runner-main-"));
  writeFileSync(join(root, "failed.mjs"), "process.exit(1);");
  writeFileSync(
    join(root, "malformed.mjs"),
    'process.stdout.write("{broken");',
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

/**
 * Execute the real CLI with controlled stdin and a handler fixture.
 * @param event Claude hook event supplied through argv.
 * @param input Raw agy stdin, including malformed input for failure checks.
 * @param target Handler path; it may be absent to exercise no-op handling.
 * @returns Captured output and status, including timeout or launch failures.
 */
function runRunner(event: string, input: string, target: string) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", runner, event, target],
    { input, encoding: "utf8", timeout: 10_000 },
  );
}

describe.each([
  ["PreToolUse", { decision: "allow" }],
  ["SessionStart", { injectSteps: [] }],
  ["UserPromptSubmit", { injectSteps: [] }],
] as const)("agy runner %s failures", (event, noop) => {
  it.each(["{broken", "null"])("no-ops when stdin is %s", (input) => {
    expect(runRunner(event, input, join(root, "absent.mjs"))).toMatchObject({
      status: 0,
      stderr: "",
      stdout: JSON.stringify(noop),
    });
  });

  it("no-ops when the handler process exits unsuccessfully", () => {
    expect(runRunner(event, "{}", join(root, "failed.mjs"))).toMatchObject({
      status: 0,
      stderr: "",
      stdout: JSON.stringify(noop),
    });
  });

  it("no-ops when the handler process returns malformed JSON", () => {
    expect(runRunner(event, "{}", join(root, "malformed.mjs"))).toMatchObject({
      status: 0,
      stderr: "",
      stdout: JSON.stringify(noop),
    });
  });
});

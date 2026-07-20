import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyFiles } from "../steps/applyFiles.js";

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "plugin-compiler-"));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function target(name = "out.json"): string {
  return join(workspace, name);
}

describe("applyFiles", () => {
  // --- basic ---

  it("creates a file that does not exist yet", () => {
    const path = target();
    const [outcome] = applyFiles(
      [{ absolutePath: path, content: "a\n" }],
      false,
    );
    expect(outcome.action).toBe("created");
    expect(readFileSync(path, "utf8")).toBe("a\n");
  });

  it("updates a file whose content differs", () => {
    const path = target();
    writeFileSync(path, "old\n", "utf8");
    const [outcome] = applyFiles(
      [{ absolutePath: path, content: "new\n" }],
      false,
    );
    expect(outcome.action).toBe("updated");
    expect(readFileSync(path, "utf8")).toBe("new\n");
  });

  it("leaves an identical file untouched", () => {
    const path = target();
    writeFileSync(path, "same\n", "utf8");
    const [outcome] = applyFiles(
      [{ absolutePath: path, content: "same\n" }],
      false,
    );
    expect(outcome.action).toBe("unchanged");
  });

  // --- complex ---

  it("creates missing parent directories", () => {
    const path = join(workspace, ".codex-plugin", "plugin.json");
    applyFiles([{ absolutePath: path, content: "{}\n" }], false);
    expect(existsSync(path)).toBe(true);
  });

  it("reports a drifted file as stale in check mode", () => {
    const path = target();
    writeFileSync(path, "hand-edited\n", "utf8");
    const [outcome] = applyFiles(
      [{ absolutePath: path, content: "generated\n" }],
      true,
    );
    expect(outcome.action).toBe("stale");
  });

  it("reports an absent file as missing in check mode", () => {
    const [outcome] = applyFiles(
      [{ absolutePath: target(), content: "x\n" }],
      true,
    );
    expect(outcome.action).toBe("missing");
  });

  it("writes nothing in check mode", () => {
    const path = target();
    writeFileSync(path, "hand-edited\n", "utf8");
    applyFiles([{ absolutePath: path, content: "generated\n" }], true);
    expect(readFileSync(path, "utf8")).toBe("hand-edited\n");
    expect(existsSync(target("other.json"))).toBe(false);
  });

  it("returns one outcome per planned file, in order", () => {
    const outcomes = applyFiles(
      [
        { absolutePath: target("a.json"), content: "a\n" },
        { absolutePath: target("b.json"), content: "b\n" },
      ],
      false,
    );
    expect(outcomes.map((outcome) => outcome.absolutePath)).toEqual([
      target("a.json"),
      target("b.json"),
    ]);
  });
});

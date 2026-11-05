import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRevision } from "../../../transactions/planning/createRevision.js";
import { applyMcpFileContent } from "../applyMcpFileContent.js";

vi.mock("@ogham/cross-platform", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogham/cross-platform")>();
  return {
    ...actual,
    writeFileAtomicallySync: () => {
      throw new Error("disk full");
    },
  };
});

describe("MCP file partial result", () => {
  let root: string;
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it("does not report a failed physical write as successful registration", () => {
    root = mkdtempSync(join(tmpdir(), "partial-mcp-"));
    const target = join(root, "mcp.json");
    const result = applyMcpFileContent({
      context: {
        owner: "example",
        target: {
          kind: "json-file",
          root,
          path: target,
          lockTarget: join(root, "lock"),
        },
      },
      plan: {
        request: { name: "owned", definition: null, replaceDrift: false },
        outcomes: [{ id: "owned", target, action: "remove" }],
        revisions: [{ target, revision: createRevision([target]) }],
      },
      content: "{}",
      write: true,
    });
    expect(result).toMatchObject({
      ok: false,
      outcomes: [{ action: "partial" }],
      partialFailures: [
        {
          applied: [],
          failed: { target, error: "disk full" },
          notAttempted: [],
          backupPaths: [],
        },
      ],
    });
  });
});

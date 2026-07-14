import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { resolveMarkdown } from "../operations/resolveMarkdown.js";

const MAX_VIEWER_MB = 1;

let workspace: string;
let elsewhere: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "deilen-workspace-"));
  elsewhere = await mkdtemp(join(tmpdir(), "deilen-elsewhere-"));
  await writeFile(join(workspace, "doc.md"), "# In workspace\n", "utf8");
  await writeFile(join(elsewhere, "doc.md"), "# Elsewhere\n", "utf8");
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
  await rm(elsewhere, { recursive: true, force: true });
});

describe("resolveMarkdown path resolution", () => {
  it("resolves a relative path against the workspace, not process.cwd()", async () => {
    const result = await resolveMarkdown(
      { path: "doc.md" },
      workspace,
      MAX_VIEWER_MB,
    );

    expect(result.sourcePath).toBe(join(workspace, "doc.md"));
    expect(result.markdown).toBe("# In workspace\n");
  });

  it("keeps an absolute path intact whatever the workspace is", async () => {
    const absolute = join(elsewhere, "doc.md");

    const result = await resolveMarkdown(
      { path: absolute },
      workspace,
      MAX_VIEWER_MB,
    );

    expect(result.sourcePath).toBe(absolute);
    expect(result.markdown).toBe("# Elsewhere\n");
  });

  it("stays cwd-equivalent when the workspace is process.cwd() (Claude)", async () => {
    const result = await resolveMarkdown(
      { path: "package.json" },
      process.cwd(),
      MAX_VIEWER_MB,
    );

    expect(result.sourcePath).toBe(resolve("package.json"));
  });
});

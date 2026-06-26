import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ERROR_MESSAGES } from "../../../constants/messages.js";
import { ArtifactKind } from "../../../types/enums.js";
import {
  collectArtifacts,
  createWorkspace,
  pruneExpired,
  readManifest,
} from "../index.js";

// Disk root is redirected to a per-file tmp dir by vitest.setup.ts.
describe("workspace", () => {
  it("creates isolated data and artifacts dirs", async () => {
    const ws = await createWorkspace();
    await writeFile(join(ws.artifactsDir, "marker.txt"), "ok");
    expect(ws.dir).toContain(ws.workspaceId);
    expect(ws.artifactsDir).toContain(ws.workspaceId);
  });

  it("collects a whitelisted artifact with sha256 and inferred kind", async () => {
    const ws = await createWorkspace();
    await writeFile(join(ws.artifactsDir, "out.csv"), "a,b\n1,2\n");
    const artifacts = await collectArtifacts(ws.workspaceId);
    const csv = artifacts.find((a) => a.path.endsWith("out.csv"));
    expect(csv?.kind).toBe(ArtifactKind.Data);
    expect(csv?.sha256).toHaveLength(64);
  });

  it("ignores files with a non-whitelisted extension", async () => {
    const ws = await createWorkspace();
    await writeFile(join(ws.artifactsDir, "tool.exe"), "x");
    const artifacts = await collectArtifacts(ws.workspaceId);
    expect(artifacts.find((a) => a.path.endsWith("tool.exe"))).toBeUndefined();
  });

  it("returns undefined when no manifest was written", async () => {
    const ws = await createWorkspace();
    expect(await readManifest(ws.workspaceId)).toBeUndefined();
  });

  it("parses a written manifest and maps artifact kind from it", async () => {
    const ws = await createWorkspace();
    await writeFile(
      join(ws.artifactsDir, "manifest.json"),
      JSON.stringify({
        seed: 1,
        artifacts: [{ id: "m", kind: "model", file: "fit.rds" }],
      }),
    );
    await writeFile(join(ws.artifactsDir, "fit.rds"), "binary");
    const manifest = await readManifest(ws.workspaceId);
    expect(manifest?.artifacts[0]?.kind).toBe(ArtifactKind.Model);
    const artifacts = await collectArtifacts(ws.workspaceId, manifest);
    expect(artifacts.find((a) => a.path.endsWith("fit.rds"))?.kind).toBe(
      ArtifactKind.Model,
    );
  });

  it("rejects a workspaceId containing path traversal characters", async () => {
    await expect(createWorkspace("../../../../tmp/x")).rejects.toThrow(
      ERROR_MESSAGES.INVALID_WORKSPACE_ID,
    );
  });

  it("accepts a valid workspaceId with alphanumeric, underscore, and hyphen", async () => {
    const ws = await createWorkspace("ws_abc-123");
    expect(ws.workspaceId).toBe("ws_abc-123");
  });

  it("reset wipes prior artifacts on workspace reuse (stateless)", async () => {
    const first = await createWorkspace("ws_reset_case");
    await writeFile(join(first.artifactsDir, "stale.csv"), "old");
    const second = await createWorkspace("ws_reset_case", { reset: true });
    expect(await readdir(second.artifactsDir)).not.toContain("stale.csv");
  });

  it("preserves prior data on workspace reuse (workspace_files)", async () => {
    const first = await createWorkspace("ws_keep_case");
    await writeFile(join(first.dataDir, "kept.csv"), "keep");
    const second = await createWorkspace("ws_keep_case");
    expect(await readdir(second.dataDir)).toContain("kept.csv");
  });

  it("preserves createdAt across workspace_files reuse", async () => {
    const first = await createWorkspace("ws_meta_keep");
    const a = JSON.parse(await readFile(join(first.dir, "meta.json"), "utf8"));
    const second = await createWorkspace("ws_meta_keep");
    const b = JSON.parse(await readFile(join(second.dir, "meta.json"), "utf8"));
    expect(typeof a.createdAt).toBe("string");
    expect(b.createdAt).toBe(a.createdAt);
  });

  it("prunes a workspace whose recorded createdAt exceeds the ttl", async () => {
    const ws = await createWorkspace("ws_old");
    await writeFile(
      join(ws.dir, "meta.json"),
      JSON.stringify({ createdAt: "2000-01-01T00:00:00.000Z" }),
    );
    const removed = await pruneExpired(72);
    expect(removed).toBeGreaterThanOrEqual(1);
    await expect(readFile(join(ws.dir, "meta.json"), "utf8")).rejects.toThrow();
  });
});

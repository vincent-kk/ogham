import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ArtifactKind } from "../../../types/enums.js";
import { collectArtifacts, createWorkspace, readManifest } from "../index.js";

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
});

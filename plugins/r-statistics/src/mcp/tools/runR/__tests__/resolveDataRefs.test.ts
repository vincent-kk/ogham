import { mkdtempSync } from "node:fs";
import { readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resetProjectRoot } from "@ogham/cross-platform/host-paths";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataFormat } from "../../../../types/enums.js";
import { resolveDataRefs } from "../operations/resolveDataRefs.js";

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** A data root + a source file placed under it (both realpath-safe). */
function rootedSource(name: string): { root: string; src: string } {
  const root = tmp("rs-root-");
  vi.stubEnv("R_STATISTICS_DATA_ROOT", root);
  return { root, src: join(root, name) };
}

afterEach(() => vi.unstubAllEnvs());

describe("resolveDataRefs", () => {
  it("rejects a ref id containing path separators (traversal guard)", async () => {
    const dir = tmp("rs-data-");
    await expect(
      resolveDataRefs(dir, [
        { id: "../escape", format: DataFormat.Csv, path: "/tmp/whatever" },
      ]),
    ).rejects.toThrow();
  });

  it("copies a valid ref under the data root and writes refs.json", async () => {
    const { src } = rootedSource("in.csv");
    await writeFile(src, "a,b\n1,2\n");
    const dir = tmp("rs-data-");
    await resolveDataRefs(dir, [
      { id: "d1", format: DataFormat.Csv, path: src },
    ]);
    const refs = JSON.parse(await readFile(join(dir, "refs.json"), "utf8"));
    expect(refs.d1.file).toBe("d1.csv");
    expect(await readFile(join(dir, "d1.csv"), "utf8")).toContain("1,2");
  });

  it("writes no refs.json when there are no refs", async () => {
    const dir = tmp("rs-data-");
    await resolveDataRefs(dir, []);
    await expect(readFile(join(dir, "refs.json"), "utf8")).rejects.toThrow();
  });

  it("rejects a source path outside the allowed data root (exfil guard)", async () => {
    rootedSource("unused");
    const dir = tmp("rs-data-");
    const outside = join(tmp("rs-outside-"), "secret.csv");
    await writeFile(outside, "x\n1\n");
    await expect(
      resolveDataRefs(dir, [
        { id: "leak", format: DataFormat.Csv, path: outside },
      ]),
    ).rejects.toThrow(/outside the allowed data root/i);
  });

  it("rejects a symlink under the root that resolves outside (symlink escape)", async () => {
    const { root } = rootedSource("unused");
    const dir = tmp("rs-data-");
    const outside = join(tmp("rs-outside-"), "secret.csv");
    await writeFile(outside, "x\n1\n");
    const link = join(root, "link.csv");
    await symlink(outside, link);
    await expect(
      resolveDataRefs(dir, [{ id: "esc", format: DataFormat.Csv, path: link }]),
    ).rejects.toThrow(/outside the allowed data root/i);
  });

  it("rejects a relative source path (absolute required)", async () => {
    rootedSource("unused");
    const dir = tmp("rs-data-");
    await expect(
      resolveDataRefs(dir, [
        { id: "rel", format: DataFormat.Csv, path: "in.csv" },
      ]),
    ).rejects.toThrow();
  });

  it("surfaces the projectRoot guidance off Claude, not DATA_ROOT_INVALID, when no root was supplied", async () => {
    // Off Claude with neither project_root nor R_STATISTICS_DATA_ROOT, the allow-root
    // cannot be resolved. The failure must tell the model to retry with project_root;
    // masking it as DATA_ROOT_INVALID would point at an env var the model cannot set.
    vi.stubEnv("OGHAM_HOST", "codex");
    vi.stubEnv("R_STATISTICS_DATA_ROOT", undefined);
    resetProjectRoot();
    const dir = tmp("rs-data-");
    await expect(
      resolveDataRefs(dir, [
        { id: "d1", format: DataFormat.Csv, path: "/whatever/in.csv" },
      ]),
    ).rejects.toThrow(/project_root/i);
  });
});

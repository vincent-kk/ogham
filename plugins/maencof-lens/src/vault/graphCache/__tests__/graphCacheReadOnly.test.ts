/** Regression coverage for the read-only boundary around maencof graph loading. */
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MetadataStore } from "@ogham/maencof";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GraphCache } from "../graphCache.js";

/** Isolated vault directory removed after each regression case. */
let vaultDir: string;
/** Index directory containing the exact disk state under test. */
let indexDir: string;
/** Valid legacy bytes whose preservation detects implicit migrations. */
const legacyIndex = JSON.stringify({
  nodes: [],
  edges: [],
  builtAt: "2026-01-01T00:00:00Z",
  nodeCount: 0,
  edgeCount: 0,
});

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "lens-readonly-"));
  indexDir = join(vaultDir, ".maencof");
  await mkdir(indexDir);
  await writeFile(join(indexDir, "index.json"), legacyIndex);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(vaultDir, { recursive: true, force: true });
});

describe("GraphCache read-only loading", () => {
  it("does not invoke the migrating loader without a commit marker", async () => {
    const load = vi.spyOn(MetadataStore.prototype, "loadGraph");
    const cache = new GraphCache();

    await cache.getGraph(vaultDir);

    expect(load).not.toHaveBeenCalled();
    expect(cache.isLoaded(vaultDir)).toBe(false);
  });

  it("preserves a legacy index without creating shards", async () => {
    const graph = await new GraphCache().getGraph(vaultDir);

    expect(await readdir(indexDir)).toEqual(["index.json"]);
    expect(await readFile(join(indexDir, "index.json"), "utf-8")).toBe(
      legacyIndex,
    );
    expect(graph).toBeNull();
  });

  it("preserves uncommitted shards alongside the legacy index", async () => {
    await writeFile(join(indexDir, "nodes.json"), "[]");
    await writeFile(join(indexDir, "edges.json"), "[]");

    const graph = await new GraphCache().getGraph(vaultDir);

    expect((await readdir(indexDir)).sort()).toEqual([
      "edges.json",
      "index.json",
      "nodes.json",
    ]);
    expect(await readFile(join(indexDir, "index.json"), "utf-8")).toBe(
      legacyIndex,
    );
    expect(graph).toBeNull();
  });

  it("does not invoke the loader when the marker cannot be read as a file", async () => {
    await mkdir(join(indexDir, "graph-meta.json"));
    const load = vi.spyOn(MetadataStore.prototype, "loadGraph");

    await expect(new GraphCache().getGraph(vaultDir)).resolves.toBeNull();

    expect(load).not.toHaveBeenCalled();
  });

  it("keeps a cached graph when the commit marker disappears", async () => {
    await writeFile(join(indexDir, "nodes.json"), "[]");
    await writeFile(join(indexDir, "edges.json"), "[]");
    await writeFile(
      join(indexDir, "graph-meta.json"),
      JSON.stringify({
        schemaVersion: 2,
        builtAt: "2026-01-01T00:00:00Z",
        nodeCount: 0,
        edgeCount: 0,
      }),
    );
    const cache = new GraphCache();
    const graph = await cache.getGraph(vaultDir);
    expect(graph).not.toBeNull();
    await rm(join(indexDir, "graph-meta.json"));
    const load = vi.spyOn(MetadataStore.prototype, "loadGraph");

    expect(await cache.getGraph(vaultDir)).toBe(graph);
    expect(load).not.toHaveBeenCalled();
    expect(await readFile(join(indexDir, "index.json"), "utf-8")).toBe(
      legacyIndex,
    );
  });

  it("returns null on a loader failure without changing the vault", async () => {
    await writeFile(join(indexDir, "graph-meta.json"), "{}");
    vi.spyOn(MetadataStore.prototype, "loadGraph").mockRejectedValue(
      new Error("unreadable shard"),
    );

    await expect(new GraphCache().getGraph(vaultDir)).resolves.toBeNull();

    expect((await readdir(indexDir)).sort()).toEqual([
      "graph-meta.json",
      "index.json",
    ]);
  });
});

/**
 * @file lensSearchContent.test.ts
 * @description lens search 의 include_content 통과 — 상한 안 본문 포함, 상한 밖 배제.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildAdjacencyList, Layer, toNodeId } from "@ogham/maencof";
import type {
  KgSearchResultItem,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from "@ogham/maencof";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleLensSearch } from "../tools/lensSearch/index.js";

const VAULT_LAYERS = [2, 3, 4, 5];

function makeNode(
  id: string,
  layer: Layer,
  title: string,
  tags: string[],
): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title,
    layer,
    tags,
    created: "2026-08-05",
    updated: "2026-08-05",
    mtime: 0,
    accessed_count: 0,
  };
}

/** L2 노트 + 상한 밖 L1 문서 — 둘 다 'kappa' 태그로 매칭된다. */
function makeVaultGraph(): KnowledgeGraph {
  const nodes = [
    makeNode("l2-note.md", Layer.L2_DERIVED, "Kappa Note", ["kappa"]),
    makeNode("l1-core.md", Layer.L1_CORE, "Kappa Secret", ["kappa"]),
  ];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: KnowledgeEdge[] = [];
  return {
    nodes: nodeMap,
    edges,
    adjacencyList: buildAdjacencyList(nodeMap, edges),
    edgeWeightMap: new Map(),
    builtAt: "2026-08-05T02:00:00Z",
    nodeCount: nodeMap.size,
    edgeCount: 0,
  };
}

describe("handleLensSearch — include_content 통과", () => {
  let vault: string;

  beforeEach(async () => {
    vault = await mkdtemp(join(tmpdir(), "lens-search-content-"));
    await writeFile(
      join(vault, "l2-note.md"),
      "---\nlayer: 2\n---\n\nKappa 본문 전체.",
      "utf-8",
    );
    await writeFile(
      join(vault, "l1-core.md"),
      "---\nlayer: 1\n---\n\nKappa 비밀 본문.",
      "utf-8",
    );
  });

  afterEach(async () => {
    await rm(vault, { recursive: true, force: true });
  });

  it("include_content=true면 상한 안 결과에 본문이 실리고 상한 밖(L1)은 배제된다", async () => {
    const result = await handleLensSearch(
      makeVaultGraph(),
      { seed: ["kappa"], include_content: true },
      vault,
      VAULT_LAYERS,
    );

    expect(result.error).toBeUndefined();
    const results = result.results as KgSearchResultItem[];
    const l2 = results.find((r) => r.path === "l2-note.md");
    expect(l2).toBeDefined();
    expect(l2!.content).toContain("Kappa 본문 전체.");
    expect(results.some((r) => r.path === "l1-core.md")).toBe(false);
  });

  it("include_content 미지정이면 어떤 결과에도 content가 없다", async () => {
    const result = await handleLensSearch(
      makeVaultGraph(),
      { seed: ["kappa"] },
      vault,
      VAULT_LAYERS,
    );

    expect(result.error).toBeUndefined();
    const results = result.results as KgSearchResultItem[];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) expect(r.content).toBeUndefined();
  });
});

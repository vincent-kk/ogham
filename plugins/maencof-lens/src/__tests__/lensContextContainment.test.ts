/**
 * @file lensContextContainment.test.ts
 * @description lens context 레이어 봉쇄 회귀 테스트.
 *   vault ceiling 이 kg_context 후보 선정 단계(pre-filter)에 전달되어
 *   제외 레이어 콘텐츠가 markdown 컨텍스트에 노출되지 않는지 확인한다.
 */
import { Layer, toNodeId } from "@ogham/maencof";
import type { KnowledgeGraph, KnowledgeNode } from "@ogham/maencof";
import { describe, expect, it } from "vitest";

import { handleLensContext } from "../tools/lensContext/lensContext.js";

const VAULT_LAYERS = [2, 3, 4, 5];

function makeNode(id: string, layer: Layer, title: string): KnowledgeNode {
  return {
    id: toNodeId(id),
    path: id,
    title,
    layer,
    tags: [],
    created: "2026-07-07",
    updated: "2026-07-07",
    mtime: 0,
    accessed_count: 0,
  };
}

function makeVaultGraph(): KnowledgeGraph {
  const nodes = [
    makeNode("l1-core.md", Layer.L1_CORE, "Identity Core Secret"),
    makeNode("l2-note.md", Layer.L2_DERIVED, "Identity Derived Note"),
    makeNode("l3-ref.md", Layer.L3_EXTERNAL, "Identity External Ref"),
  ];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return {
    nodes: nodeMap,
    edges: [],
    adjacencyList: new Map(),
    edgeWeightMap: new Map(),
    builtAt: "2026-07-07T00:00:00Z",
    nodeCount: nodeMap.size,
    edgeCount: 0,
  };
}

describe("handleLensContext 레이어 봉쇄", () => {
  it("vault ceiling 밖(L1) 콘텐츠는 markdown 컨텍스트에 노출되지 않는다", async () => {
    const result = await handleLensContext(
      makeVaultGraph(),
      { query: "identity" },
      "/nonexistent-vault",
      VAULT_LAYERS,
    );
    expect(result.error).toBeUndefined();
    const context = result.context as string;
    expect(context).toContain("Identity Derived Note");
    expect(context).toContain("Identity External Ref");
    expect(context).not.toContain("Identity Core Secret");
  });

  it("layer_filter 로 vault ceiling 을 넘을 수 없다 (교집합 공집합 → ceiling 폴백)", async () => {
    const result = await handleLensContext(
      makeVaultGraph(),
      { query: "identity", layer_filter: [1] },
      "/nonexistent-vault",
      VAULT_LAYERS,
    );
    const context = result.context as string;
    expect(context).not.toContain("Identity Core Secret");
    expect(context).toContain("Identity Derived Note");
  });

  it("ceiling 내 layer_filter 는 교집합으로 후보를 좁힌다", async () => {
    const result = await handleLensContext(
      makeVaultGraph(),
      { query: "identity", layer_filter: [2] },
      "/nonexistent-vault",
      VAULT_LAYERS,
    );
    const context = result.context as string;
    expect(context).toContain("Identity Derived Note");
    expect(context).not.toContain("Identity External Ref");
    expect(context).not.toContain("Identity Core Secret");
  });
});

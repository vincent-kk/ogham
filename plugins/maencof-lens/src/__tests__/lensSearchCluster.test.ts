/**
 * @file lensSearchCluster.test.ts
 * @description lens search 의 cluster 열기 통과 (R4) — 열거 결과의 레이어 상한 후필터,
 * seed 검색 collapse 표기 무변형 전달.
 */
import { buildAdjacencyList, Layer, toNodeId } from "@ogham/maencof";
import type {
  KgSearchResultItem,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from "@ogham/maencof";
import { describe, expect, it } from "vitest";

import { handleLensSearch } from "../tools/lensSearch/index.js";

const VAULT_LAYERS = [2, 3, 4, 5];

function makeNode(
  id: string,
  layer: Layer,
  title: string,
  tags: string[],
  overrides?: Partial<KnowledgeNode>,
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
    ...overrides,
  };
}

/** 같은 clusterKey 를 공유하는 L2 멤버 2건 + 상한 밖 L1 멤버 1건. */
function makeClusterVaultGraph(): KnowledgeGraph {
  const nodes = [
    makeNode("l2-th-old.md", Layer.L2_DERIVED, "Rho Thread Old", ["rho"], {
      clusterKey: "rho-thread",
      updated: "2026-02-01",
    }),
    makeNode("l2-th-new.md", Layer.L2_DERIVED, "Rho Thread New", ["rho"], {
      clusterKey: "rho-thread",
      updated: "2026-02-05",
    }),
    makeNode("l1-th.md", Layer.L1_CORE, "Rho Secret", ["rho"], {
      clusterKey: "rho-thread",
      updated: "2026-02-09",
    }),
  ];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges: KnowledgeEdge[] = [];
  return {
    nodes: nodeMap,
    edges,
    adjacencyList: buildAdjacencyList(nodeMap, edges),
    edgeWeightMap: new Map(),
    builtAt: "2026-08-20T03:00:00Z",
    nodeCount: nodeMap.size,
    edgeCount: 0,
  };
}

describe("handleLensSearch — cluster 열기 (R4)", () => {
  it("cluster 열거 결과에서 상한 밖(L1) 멤버가 걸러진다", async () => {
    const result = await handleLensSearch(
      makeClusterVaultGraph(),
      { cluster: "rho-thread" },
      "/tmp/unused",
      VAULT_LAYERS,
    );

    expect(result.error).toBeUndefined();
    const items = result.results as KgSearchResultItem[];
    expect(items.map((i) => i.path)).toEqual(["l2-th-new.md", "l2-th-old.md"]);
    for (const item of items) expect(item.clusterKey).toBe("rho-thread");
    expect(result.cluster).toBe("rho-thread");
    expect(result.clusterSize).toBe(3);
  });

  it("seed 검색의 collapse 표기가 무변형으로 통과한다", async () => {
    const result = await handleLensSearch(
      makeClusterVaultGraph(),
      { seed: ["rho"] },
      "/tmp/unused",
      VAULT_LAYERS,
    );

    expect(result.error).toBeUndefined();
    const items = result.results as KgSearchResultItem[];
    const clustered = items.filter((i) => i.clusterKey === "rho-thread");
    expect(clustered).toHaveLength(1);
    expect(clustered[0]!.path).toBe("l2-th-new.md");
    expect(clustered[0]!.collapsedCount).toBe(1);
  });
});

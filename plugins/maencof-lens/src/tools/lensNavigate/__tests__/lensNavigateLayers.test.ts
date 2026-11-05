/** Regression coverage for document identity containment in navigation responses. */
import { toNodeId } from "@ogham/maencof";
import { describe, expect, it } from "vitest";

import { handleLensNavigate } from "../lensNavigate.js";

import { createNavigateGraph } from "./fixtures/createNavigateGraph.js";

/** Target path shared by the real-graph navigation cases. */
const targetPath = "02_Derived/target.md";
/** Restricted document identity that must never escape the configured ceiling. */
const restrictedPath = "02_Derived/restricted.md";

describe("handleLensNavigate layer ceiling", () => {
  it.each([
    "inbound",
    "outbound",
    "children",
    "siblings",
    "crossLayer",
    "domain",
  ])("filters restricted documents from %s", async (field) => {
    const result = await handleLensNavigate(
      createNavigateGraph(),
      { path: targetPath },
      [2],
    );

    expect(result[field]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "02_Derived/allowed.md" }),
      ]),
    );
    expect(JSON.stringify(result[field])).not.toContain(restrictedPath);
    expect(JSON.stringify(result[field])).not.toContain("Restricted title");
  });

  it("omits a restricted parent without mutating the graph", async () => {
    const graph = createNavigateGraph();
    const before = structuredClone(graph);

    const result = await handleLensNavigate(graph, { path: targetPath }, [2]);

    expect(result.parent).toBeUndefined();
    expect(graph).toEqual(before);
    expect(JSON.stringify(result)).not.toContain(restrictedPath);
  });

  it("returns only a restricted-layer error for a restricted target", async () => {
    const result = await handleLensNavigate(
      createNavigateGraph(),
      { path: restrictedPath },
      [2],
    );

    expect(result).toEqual({ error: "Document is in a restricted layer (L1)" });
    expect(JSON.stringify(result)).not.toContain(restrictedPath);
    expect(JSON.stringify(result)).not.toContain("Restricted title");
  });

  it("preserves all relationships when their layers are allowed", async () => {
    const result = await handleLensNavigate(
      createNavigateGraph(),
      { path: restrictedPath },
      [1, 2],
    );

    expect(result.error).toBeUndefined();
    expect(result.node).toEqual(
      expect.objectContaining({ path: restrictedPath }),
    );
    expect(result.parent).toEqual(
      expect.objectContaining({ path: targetPath }),
    );
  });

  it("preserves neighbors whose layer is unknown", async () => {
    const graph = createNavigateGraph();
    const node = graph.nodes.get(toNodeId(restrictedPath))!;
    Reflect.deleteProperty(node, "layer");

    const result = await handleLensNavigate(graph, { path: targetPath }, [2]);

    expect(result.parent).toEqual(node);
    for (const field of [
      "inbound",
      "outbound",
      "children",
      "siblings",
      "crossLayer",
      "domain",
    ])
      expect(result[field]).toEqual(expect.arrayContaining([node]));
  });

  it("retains index absence guidance", async () => {
    expect(await handleLensNavigate(null, { path: targetPath }, [2])).toEqual({
      error: "Vault index not available. Run kg_build in a maencof session.",
    });
  });

  it("preserves a target whose layer is unknown", async () => {
    const graph = createNavigateGraph();
    const node = graph.nodes.get(toNodeId(targetPath))!;
    Reflect.deleteProperty(node, "layer");

    const result = await handleLensNavigate(graph, { path: targetPath }, [2]);

    expect(result.error).toBeUndefined();
    expect(result.node).toEqual({
      ...node,
      outboundLinks: node.outboundLinks?.filter(
        (path) => path !== restrictedPath,
      ),
    });
  });

  it("filters links on an allowed parent without changing cached nodes", async () => {
    const graph = createNavigateGraph();
    const before = structuredClone(graph);

    const result = await handleLensNavigate(
      graph,
      { path: "02_Derived/allowed.md" },
      [2],
    );

    expect(result.parent).toEqual(
      expect.objectContaining({ path: targetPath }),
    );
    expect(JSON.stringify(result)).not.toContain(restrictedPath);
    expect(graph).toEqual(before);
  });

  it("retains allowed and unresolved outbound links", async () => {
    const result = await handleLensNavigate(
      createNavigateGraph(),
      { path: targetPath },
      [2],
    );

    expect(result.node).toEqual(
      expect.objectContaining({
        outboundLinks: ["02_Derived/allowed.md", "02_Derived/missing.md"],
      }),
    );
  });
});

import { describe, expect, it } from "vitest";

import type { MarketplaceFacts } from "../../types/index.js";
import { buildAgyDeclaredPlugins } from "../builders/buildAgyDeclaredPlugins.js";

describe("buildAgyDeclaredPlugins", () => {
  // --- basic ---

  it("declares one entry per marketplace plugin", () => {
    const facts: MarketplaceFacts = {
      name: "ogham",
      plugins: [
        { name: "filid", source: "./plugins/filid" },
        { name: "prawf", source: "./plugins/prawf" },
      ],
    };
    expect(buildAgyDeclaredPlugins(facts)).toEqual({
      entries: [{ path: "./plugins/filid" }, { path: "./plugins/prawf" }],
    });
  });

  it("emits an empty entry list for an empty marketplace", () => {
    expect(buildAgyDeclaredPlugins({ name: "ogham", plugins: [] })).toEqual({
      entries: [],
    });
  });

  it("carries only the source path (no name or category)", () => {
    const built = buildAgyDeclaredPlugins({
      name: "ogham",
      plugins: [{ name: "filid", source: "./plugins/filid", category: "dev" }],
    }) as { entries: Record<string, unknown>[] };
    expect(Object.keys(built.entries[0])).toEqual(["path"]);
  });
});

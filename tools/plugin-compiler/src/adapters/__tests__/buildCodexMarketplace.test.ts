import { describe, expect, it } from "vitest";

import type { MarketplaceFacts } from "../../types/index.js";
import { buildCodexMarketplace } from "../builders/buildCodexMarketplace.js";

const facts: MarketplaceFacts = {
  name: "ogham",
  plugins: [
    { name: "filid", source: "./plugins/filid", category: "development" },
    { name: "prawf", source: "./plugins/prawf" },
  ],
};

describe("buildCodexMarketplace", () => {
  // --- basic ---

  it("carries the marketplace name into the display name", () => {
    expect(buildCodexMarketplace(facts)).toMatchObject({
      name: "ogham",
      interface: { displayName: "ogham" },
    });
  });

  it("nests each source under the codex local-source schema", () => {
    const [first] = buildCodexMarketplace(facts).plugins as Record<
      string,
      unknown
    >[];
    expect(first.source).toEqual({ source: "local", path: "./plugins/filid" });
  });

  it("attaches the install/auth policy to every entry", () => {
    const [first] = buildCodexMarketplace(facts).plugins as Record<
      string,
      unknown
    >[];
    expect(first.policy).toEqual({
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    });
  });

  // --- complex ---

  it("title-cases the category", () => {
    const [first] = buildCodexMarketplace(facts).plugins as Record<
      string,
      unknown
    >[];
    expect(first.category).toBe("Development");
  });

  it("falls back to the default category when absent", () => {
    const [, second] = buildCodexMarketplace(facts).plugins as Record<
      string,
      unknown
    >[];
    expect(second.category).toBe("Productivity");
  });

  it("preserves plugin order", () => {
    const plugins = buildCodexMarketplace(facts).plugins as Record<
      string,
      unknown
    >[];
    expect(plugins.map((plugin) => plugin.name)).toEqual(["filid", "prawf"]);
  });
});

import type { MarketplaceFacts } from "../../types/index.js";

const DEFAULT_CATEGORY = "Productivity";

export function buildCodexMarketplace(
  facts: MarketplaceFacts,
): Record<string, unknown> {
  return {
    name: facts.name,
    interface: { displayName: facts.name },
    plugins: facts.plugins.map((plugin) => ({
      name: plugin.name,
      source: { source: "local", path: plugin.source },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: titleCase(plugin.category ?? DEFAULT_CATEGORY),
    })),
  };
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

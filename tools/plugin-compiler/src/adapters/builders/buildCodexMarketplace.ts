import type { MarketplaceFacts } from "../../types/adapter.js";

const DEFAULT_CATEGORY = "Productivity";

/**
 * `.agents/plugins/marketplace.json` content — Codex marketplace schema
 * (nested source/policy). Source paths from the Claude manifest are already
 * marketplace-root-relative (`./plugins/<n>`) and carry over verbatim.
 */
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

import type { MarketplaceFacts } from "../../types/index.js";

export function buildAgyDeclaredPlugins(
  facts: MarketplaceFacts,
): Record<string, unknown> {
  return { entries: facts.plugins.map((plugin) => ({ path: plugin.source })) };
}

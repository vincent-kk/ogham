import type { MarketplaceFacts } from "../../types/adapter.js";

/**
 * `.agents/plugins.json` content — Antigravity declared-plugins layer.
 * Checking this file in lets a cloned workspace activate the plugins without
 * an install command.
 */
export function buildAgyDeclaredPlugins(
  facts: MarketplaceFacts,
): Record<string, unknown> {
  return { entries: facts.plugins.map((plugin) => ({ path: plugin.source })) };
}

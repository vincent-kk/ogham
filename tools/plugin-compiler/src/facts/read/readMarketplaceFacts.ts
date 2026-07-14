import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLAUDE_MARKETPLACE_PATH } from "../../constants/hosts.js";
import type {
  MarketplaceFacts,
  MarketplacePluginFacts,
} from "../../types/adapter.js";

interface RawMarketplace {
  name?: string;
  plugins?: { name?: string; source?: unknown; category?: string }[];
}

/** Reads the root Claude marketplace manifest (read-only) into facts. */
export function readMarketplaceFacts(rootDirectory: string): MarketplaceFacts {
  const path = join(rootDirectory, CLAUDE_MARKETPLACE_PATH);
  const raw = JSON.parse(readFileSync(path, "utf8")) as RawMarketplace;
  if (typeof raw.name !== "string" || !raw.name)
    throw new Error(`marketplace manifest has no name: ${path}`);

  const plugins: MarketplacePluginFacts[] = [];
  for (const entry of raw.plugins ?? []) {
    if (typeof entry.name !== "string" || typeof entry.source !== "string")
      throw new Error(
        `marketplace entry needs a string name and source: ${JSON.stringify(entry)}`,
      );
    plugins.push({
      name: entry.name,
      source: entry.source,
      category: entry.category,
    });
  }
  return { name: raw.name, plugins };
}

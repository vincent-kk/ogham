import type { HooksFileSource, McpServerSource } from "./source.js";

export interface PluginFacts {
  directory: string;
  name: string;
  manifest: Record<string, unknown>;
  hasSkills: boolean;
  hasHooks: boolean;
  hooksFile: HooksFileSource | null;
  mcpServers: Record<string, McpServerSource> | null;
}

export interface MarketplacePluginFacts {
  name: string;
  source: string;
  category?: string;
}

export interface MarketplaceFacts {
  name: string;
  plugins: MarketplacePluginFacts[];
}

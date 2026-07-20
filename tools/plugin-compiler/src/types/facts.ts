import type { HooksFileSource, McpServerSource } from "./source.js";

export interface PluginFacts {
  directory: string;
  name: string;
  manifest: Record<string, unknown>;
  hasSkills: boolean;
  hasHooks: boolean;
  hooksFile: HooksFileSource | null;
  mcpServers: Record<string, McpServerSource> | null;
  /** `agents/*.md` basename → file content. Empty when the plugin has no `agents/` dir. */
  agentFiles: Record<string, string>;
  /**
   * Every file under `skills/`, keyed by its POSIX path relative to `skills/`.
   * Empty when the plugin has no `skills/` dir. Feeds the Codex skill-variant
   * copy-all + persona-spawn rewrite (`buildCodexSkills`).
   */
  skillFiles: Record<string, string>;
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

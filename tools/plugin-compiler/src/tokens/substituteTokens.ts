/** Resolves the logical tokens a skill body may contain, for one target host. */
export interface TokenResolver {
  /** `{{tool:<logical>}}` → host model-facing MCP tool name. */
  tool(logical: string): string;
  /** `{{skill:<name>}}` → host skill cross-reference. */
  skill(name: string): string;
  /** `{{pluginRoot}}` → host plugin-root expansion; throws if the host forbids it. */
  pluginRoot(): string;
}

const TOOL = /\{\{tool:([a-zA-Z0-9_]+)\}\}/g;
const SKILL = /\{\{skill:([a-zA-Z0-9_-]+)\}\}/g;
const PLUGIN_ROOT = /\{\{pluginRoot\}\}/g;

/**
 * Replace `{{tool:}}` / `{{skill:}}` / `{{pluginRoot}}` tokens in text using a
 * host resolver. Leaves unknown `{{...}}` intact so the lint pass can flag them.
 */
export function substituteTokens(text: string, resolve: TokenResolver): string {
  return text
    .replace(TOOL, (_, logical: string) => resolve.tool(logical))
    .replace(SKILL, (_, name: string) => resolve.skill(name))
    .replace(PLUGIN_ROOT, () => resolve.pluginRoot());
}

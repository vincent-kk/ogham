function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reverse of the Claude emit: turn a committed body into a host-neutral
 * definition body. The plugin's own full-form tool names become `{{tool:}}`
 * tokens, `${CLAUDE_PLUGIN_ROOT}` becomes `{{pluginRoot}}`, and `/plugin:skill`
 * cross-references become `{{skill:}}`. External tool names (other servers) are
 * left literal — they are not this plugin's tokens.
 */
export function tokenizeBody(
  text: string,
  plugin: string,
  server: string,
): string {
  const tool = new RegExp(
    `mcp__plugin_${escapeRe(plugin)}_${escapeRe(server)}__([a-zA-Z0-9_]+)`,
    "g",
  );
  const skill = new RegExp(`/${escapeRe(plugin)}:([a-zA-Z0-9_-]+)`, "g");
  return text
    .replace(tool, (_, t: string) => `{{tool:${t}}}`)
    .replaceAll("${CLAUDE_PLUGIN_ROOT}", "{{pluginRoot}}")
    .replace(skill, (_, s: string) => `{{skill:${s}}}`);
}

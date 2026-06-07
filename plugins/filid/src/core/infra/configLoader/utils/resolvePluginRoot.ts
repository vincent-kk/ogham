/** Resolve the plugin root from caller argument or CLAUDE_PLUGIN_ROOT env. */
export function resolvePluginRoot(pluginRoot?: string): string | null {
  return pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT ?? null;
}

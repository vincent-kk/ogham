import { pluginRoot as hostPluginRoot } from '@ogham/cross-platform/host-paths';

/** Resolve the plugin root from caller argument or the host's plugin-root channel. */
export function resolvePluginRoot(pluginRoot?: string): string | null {
  return pluginRoot ?? hostPluginRoot();
}

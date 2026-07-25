import { pluginCache } from '@ogham/cross-platform/paths/plugin-cache';

export function getPluginRoot(): string {
  return pluginCache('filid');
}

import { pluginCache } from '@ogham/cross-platform/paths';

export function getPluginRoot(): string {
  return pluginCache('filid');
}

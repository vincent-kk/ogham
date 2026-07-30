import { pluginCache } from '@ogham/cross-platform';

export function getPluginRoot(): string {
  return pluginCache('filid');
}

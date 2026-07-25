import type { YoutubeAddonConfig } from '../../../types/index.js';

type YoutubeUserMcpHost = 'codex' | 'claude';

export type UserMcpAction = 'add' | 'remove' | 'skip';

function userMcpDesired(
  host: YoutubeUserMcpHost,
  youtube: YoutubeAddonConfig,
): boolean {
  return youtube.enabled && youtube.targets[host];
}

// Avoids spawning a user MCP CLI when the effective target state is unchanged.
// With no prior config, reconcile defensively so stale owned entries are removed.
export function resolveUserMcpAction(
  host: YoutubeUserMcpHost,
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): UserMcpAction {
  if (userMcpDesired(host, next)) {
    if (prev && userMcpDesired(host, prev) && prev.language === next.language)
      return 'skip';

    return 'add';
  }
  if (!prev || userMcpDesired(host, prev)) return 'remove';
  return 'skip';
}

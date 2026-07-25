import type { YoutubeAddonConfig } from '../../../types/index.js';
import { resolveUserMcpAction } from '../utils/resolveUserMcpAction.js';

import { provisionAntigravityYoutube } from './provisionAntigravity.js';
import type { ProvisionResult } from './provisionResult.js';
import {
  type YoutubeUserMcpHost,
  provisionUserMcpYoutube,
} from './provisionUserMcp.js';

export interface YoutubeProvisionSummary {
  claude: ProvisionResult;
  codex: ProvisionResult;
  antigravity: ProvisionResult;
}

async function provisionUserTarget(
  host: YoutubeUserMcpHost,
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): Promise<ProvisionResult> {
  const action = resolveUserMcpAction(host, next, prev);
  if (action === 'add')
    return provisionUserMcpYoutube(host, true, next.language);
  if (action === 'remove')
    return provisionUserMcpYoutube(host, false, next.language);
  return { ok: true, action: 'unchanged' };
}

// Reconciles the yt-dlp-mcp MCP server across all target CLIs from the saved
// addon config. The effective per-CLI state is `enabled && targets.<cli>`.
// Claude and Codex delegate user-scoped MCP reconciliation to agent-artifacts;
// Antigravity keeps its JSON adapter. `prev` gates needless user CLI work.
export async function provisionYoutube(
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): Promise<YoutubeProvisionSummary> {
  const claude = await provisionUserTarget('claude', next, prev);
  const codex = await provisionUserTarget('codex', next, prev);
  const antigravity = await provisionAntigravityYoutube(
    next.enabled && next.targets.antigravity,
    next.language,
  );

  return { claude, codex, antigravity };
}

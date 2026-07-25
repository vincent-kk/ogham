import type { YoutubeAddonConfig } from '../../../types/index.js';
import { resolveCodexAction } from '../utils/resolveCodexAction.js';

import { provisionAntigravityYoutube } from './provisionAntigravity.js';
import { provisionCodexYoutube } from './provisionCodex.js';
import type { ProvisionResult } from './provisionResult.js';

export interface YoutubeProvisionSummary {
  antigravity: ProvisionResult;
  codex: ProvisionResult;
}

// Reconciles the yt-dlp-mcp MCP server across both target CLIs from the saved
// addon config. The effective per-CLI state is `enabled && targets.<cli>`.
// Antigravity keeps its existing JSON adapter; Codex delegates user-scoped MCP
// reconciliation to agent-artifacts. `prev` only gates needless Codex work.
export async function provisionYoutube(
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): Promise<YoutubeProvisionSummary> {
  const antigravity = await provisionAntigravityYoutube(
    next.enabled && next.targets.antigravity,
    next.language,
  );

  const codexAction = resolveCodexAction(next, prev);
  let codex: ProvisionResult;
  if (codexAction === 'add')
    codex = await provisionCodexYoutube(true, next.language);
  else if (codexAction === 'remove')
    codex = await provisionCodexYoutube(false, next.language);
  else codex = { ok: true, action: 'unchanged' };

  return { antigravity, codex };
}

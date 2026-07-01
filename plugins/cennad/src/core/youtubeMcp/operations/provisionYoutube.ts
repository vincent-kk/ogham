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
// addon config. The effective per-CLI state is `enabled && targets.<cli>`. antigravity
// is provisioned via its mcp_config.json (the file op no-ops when already correct);
// codex via `codex mcp add|remove`, gated by resolveCodexAction so it only spawns when
// the effective state changes. `prev` is the config before this save and is used only
// to skip needless codex spawns; omit it to always reconcile.
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

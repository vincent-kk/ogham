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

/**
 * Reconciles target registrations while preserving inactive manual Antigravity entries.
 * @param next Settings being saved, including target switches and server language.
 * @param prev Previously saved settings; Antigravity removal requires prior activation.
 * @returns Per-target outcomes, including provisioning failures without rejecting the save.
 */
export async function provisionYoutube(
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): Promise<YoutubeProvisionSummary> {
  const claude = await provisionUserTarget('claude', next, prev);
  const codex = await provisionUserTarget('codex', next, prev);
  const antigravityEnabled = next.enabled && next.targets.antigravity;
  const antigravityWasEnabled = prev?.enabled && prev.targets.antigravity;
  const antigravity: ProvisionResult =
    antigravityEnabled || antigravityWasEnabled
      ? await provisionAntigravityYoutube(antigravityEnabled, next.language)
      : { ok: true, action: 'unchanged' };

  return { claude, codex, antigravity };
}

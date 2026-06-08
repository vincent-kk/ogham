import type { YoutubeAddonConfig } from '../../../types/index.js';

export type CodexAction = 'add' | 'remove' | 'skip';

function codexDesired(youtube: YoutubeAddonConfig): boolean {
  return youtube.enabled && youtube.targets.codex;
}

// Decides whether codex provisioning must run, so the orchestrator avoids spawning
// `codex mcp ...` when the effective codex state is unchanged. `add` re-runs when the
// language changed (codex add overwrites). With no prior config (prev undefined) we
// reconcile defensively: add when desired, otherwise remove.
export function resolveCodexAction(
  next: YoutubeAddonConfig,
  prev?: YoutubeAddonConfig,
): CodexAction {
  if (codexDesired(next)) {
    if (prev && codexDesired(prev) && prev.language === next.language) {
      return 'skip';
    }
    return 'add';
  }
  if (!prev || codexDesired(prev)) return 'remove';
  return 'skip';
}

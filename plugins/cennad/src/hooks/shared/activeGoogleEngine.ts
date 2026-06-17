import type { HookConfig } from './configTypes.js';

// gemini and antigravity are mutually exclusive Google engines. The on-disk
// config is normalized at save/load, but hooks read the file directly, so this
// resolves the active engine defensively — antigravity wins if both look
// enabled (the migration target). Returns null when neither is enabled.
export function activeGoogleEngine(
  config: HookConfig,
): 'gemini' | 'antigravity' | null {
  if (config.ratio.antigravity.enabled) return 'antigravity';
  if (config.ratio.gemini.enabled) return 'gemini';
  return null;
}

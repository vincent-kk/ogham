import type { HookConfig } from './configTypes.js';

// antigravity is the sole Google engine. Returns 'antigravity' when enabled,
// otherwise null. Kept as a named resolver so injectStatic/injectDynamic stay
// engine-agnostic at their call sites.
export function activeGoogleEngine(config: HookConfig): 'antigravity' | null {
  return config.ratio.antigravity.enabled ? 'antigravity' : null;
}

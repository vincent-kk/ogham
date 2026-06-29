import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { Ratio } from './configTypes.js';
import { isPlainObject } from './isPlainObject.js';
import { pickProviderRatio } from './pickProviderRatio.js';

export function pickRatio(raw: unknown): Ratio {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG.ratio;
  const gemini = raw.gemini;
  const codex = raw.codex;
  const antigravity = raw.antigravity;

  if (typeof gemini === 'number' && typeof codex === 'number') {
    // Legacy pre-antigravity integer ratio; the removed gemini weight migrates
    // onto the antigravity (Google) slot.
    const gw = Math.max(0, Math.floor(gemini));
    const cw = Math.max(0, Math.floor(codex));
    const total = gw + cw;
    if (total === 0) return DEFAULT_CONFIG.ratio;
    const aPct = Math.round((gw / total) * 100);
    return {
      codex: { value: 100 - aPct, enabled: cw > 0 },
      antigravity: { value: aPct, enabled: gw > 0 },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    };
  }

  // Match configManager migration: old canonical configs carried an enabled
  // Gemini slot beside a disabled Antigravity placeholder. Prefer that active
  // Gemini slot so hook behavior is stable before and after disk pruning.
  const antigravitySource =
    isPlainObject(gemini) &&
    gemini.enabled === true &&
    (!isPlainObject(antigravity) || antigravity.enabled !== true)
      ? gemini
      : isPlainObject(antigravity)
        ? antigravity
        : gemini;
  return {
    codex: pickProviderRatio(codex, DEFAULT_CONFIG.ratio.codex),
    antigravity: pickProviderRatio(
      antigravitySource,
      DEFAULT_CONFIG.ratio.antigravity,
    ),
    claude: pickProviderRatio(raw.claude, DEFAULT_CONFIG.ratio.claude),
  };
}

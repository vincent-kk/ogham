import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { Ratio } from './configTypes.js';
import { isObj } from './isObj.js';
import { pickProviderRatio } from './pickProviderRatio.js';

export function pickRatio(raw: unknown): Ratio {
  if (!isObj(raw)) return DEFAULT_CONFIG.ratio;
  const g = raw.gemini;
  const c = raw.codex;
  const a = raw.antigravity;

  if (typeof g === 'number' && typeof c === 'number') {
    // Legacy pre-antigravity integer ratio; the removed gemini weight migrates
    // onto the antigravity (Google) slot.
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULT_CONFIG.ratio;
    const aPct = Math.round((gw / total) * 100);
    return {
      codex: { value: 100 - aPct, enabled: cw > 0 },
      antigravity: { value: aPct, enabled: gw > 0 },
      claude: { ...DEFAULT_CONFIG.ratio.claude },
    };
  }

  return {
    codex: pickProviderRatio(c, DEFAULT_CONFIG.ratio.codex),
    antigravity: pickProviderRatio(a, DEFAULT_CONFIG.ratio.antigravity),
    claude: pickProviderRatio(raw.claude, DEFAULT_CONFIG.ratio.claude),
  };
}

import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { Ratio } from './configTypes.js';
import { isObj } from './isObj.js';
import { pickProviderRatio } from './pickProviderRatio.js';

export function pickRatio(raw: unknown): Ratio {
  if (!isObj(raw)) return DEFAULT_CONFIG.ratio;
  const g = raw.gemini;
  const c = raw.codex;

  if (typeof g === 'number' && typeof c === 'number') {
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULT_CONFIG.ratio;
    const gPct = Math.round((gw / total) * 100);
    return {
      gemini: { value: gPct, enabled: gw > 0 },
      codex: { value: 100 - gPct, enabled: cw > 0 },
    };
  }

  return {
    gemini: pickProviderRatio(g, DEFAULT_CONFIG.ratio.gemini),
    codex: pickProviderRatio(c, DEFAULT_CONFIG.ratio.codex),
  };
}

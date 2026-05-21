import type { Ratio } from './configTypes.js';
import { DEFAULTS } from './defaults.js';
import { isObj } from './isObj.js';
import { pickProviderRatio } from './pickProviderRatio.js';

export function pickRatio(raw: unknown): Ratio {
  if (!isObj(raw)) return DEFAULTS.ratio;
  const g = raw.gemini;
  const c = raw.codex;

  if (typeof g === 'number' && typeof c === 'number') {
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULTS.ratio;
    const gPct = Math.round((gw / total) * 100);
    return {
      gemini: { value: gPct, enabled: gw > 0 },
      codex: { value: 100 - gPct, enabled: cw > 0 },
    };
  }

  return {
    gemini: pickProviderRatio(g, DEFAULTS.ratio.gemini),
    codex: pickProviderRatio(c, DEFAULTS.ratio.codex),
  };
}

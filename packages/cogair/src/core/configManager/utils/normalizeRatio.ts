import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function normalizeRatio(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG.ratio;
  const g = raw.gemini;
  const c = raw.codex;
  if (typeof g === 'number' && typeof c === 'number') {
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULT_CONFIG.ratio;
    const gPct = Math.round((gw / total) * 100);
    const cPct = 100 - gPct;
    return {
      gemini: { value: gPct, enabled: gw > 0 },
      codex: { value: cPct, enabled: cw > 0 },
    };
  }
  return {
    gemini: isPlainObject(g)
      ? { ...DEFAULT_CONFIG.ratio.gemini, ...g }
      : DEFAULT_CONFIG.ratio.gemini,
    codex: isPlainObject(c)
      ? { ...DEFAULT_CONFIG.ratio.codex, ...c }
      : DEFAULT_CONFIG.ratio.codex,
  };
}

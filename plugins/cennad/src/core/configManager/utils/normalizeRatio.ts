import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function normalizeRatio(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG.ratio;
  const g = raw.gemini;
  const c = raw.codex;
  const a = raw.antigravity;
  if (typeof g === 'number' && typeof c === 'number') {
    // Legacy pre-antigravity integer ratio. The removed gemini provider's weight
    // migrates onto the antigravity (Google) slot so the user's split is kept.
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULT_CONFIG.ratio;
    const aPct = Math.round((gw / total) * 100);
    return {
      codex: { value: 100 - aPct, enabled: cw > 0 },
      antigravity: { value: aPct, enabled: gw > 0 },
    };
  }
  return {
    codex: isPlainObject(c)
      ? { ...DEFAULT_CONFIG.ratio.codex, ...c }
      : DEFAULT_CONFIG.ratio.codex,
    antigravity: isPlainObject(a)
      ? { ...DEFAULT_CONFIG.ratio.antigravity, ...a }
      : DEFAULT_CONFIG.ratio.antigravity,
  };
}

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function normalizeRatio(raw: unknown): unknown {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG.ratio;
  const g = raw.gemini;
  const c = raw.codex;
  const a = raw.antigravity;
  if (typeof g === 'number' && typeof c === 'number') {
    // Legacy pre-antigravity integer ratio. The removed gemini provider's weight
    // migrates onto the antigravity (Google) slot so the user's split is kept;
    // claude takes its default.
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
  // Before Gemini was removed, canonical configs contained both Google slots:
  // Gemini enabled and Antigravity disabled by default. In that state the
  // active Gemini slot must migrate onto Antigravity rather than being hidden
  // by the mere presence of the disabled Antigravity placeholder.
  const antigravitySource =
    isPlainObject(g) &&
    g.enabled === true &&
    (!isPlainObject(a) || a.enabled !== true)
      ? g
      : isPlainObject(a)
        ? a
        : g;
  return {
    codex: isPlainObject(c)
      ? { ...DEFAULT_CONFIG.ratio.codex, ...c }
      : DEFAULT_CONFIG.ratio.codex,
    antigravity: isPlainObject(antigravitySource)
      ? { ...DEFAULT_CONFIG.ratio.antigravity, ...antigravitySource }
      : DEFAULT_CONFIG.ratio.antigravity,
    claude: isPlainObject(raw.claude)
      ? { ...DEFAULT_CONFIG.ratio.claude, ...raw.claude }
      : DEFAULT_CONFIG.ratio.claude,
  };
}

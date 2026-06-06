import { isPlainObject } from './isPlainObject.js';

// gemini and antigravity are mutually exclusive Google engines (Gemini CLI EOL
// 2026-06-18). When a legacy or hand-edited config has both enabled, prefer
// antigravity (the migration target) and disable gemini. Operates on the
// already-normalized ratio object and stays unknown-safe so it can sit in the
// merge pipeline before ConfigSchema validation.
export function normalizeMutualExclusion(ratio: unknown): unknown {
  if (!isPlainObject(ratio)) return ratio;
  const g = ratio.gemini;
  const a = ratio.antigravity;
  if (
    isPlainObject(g) &&
    isPlainObject(a) &&
    g.enabled === true &&
    a.enabled === true
  ) {
    return { ...ratio, gemini: { ...g, enabled: false } };
  }
  return ratio;
}

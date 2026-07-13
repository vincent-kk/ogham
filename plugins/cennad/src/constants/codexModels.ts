import type { CodexEffort } from '../types/dispatch.js';

// Ordered reasoning-effort scale. codex hard-fails an effort the selected model
// does not advertise, so the settings UI offers only that model's levels.
export const CODEX_EFFORT_LEVELS: readonly CodexEffort[] = [
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'ultra',
];

// Static fallback for when the live catalog (`codex debug models`, served by
// core/codexModels) is unreachable — codex not installed, offline, or an older
// CLI. The live catalog always wins when present.
export const CODEX_FALLBACK_MODEL_EFFORT_SETS: Record<
  string,
  readonly CodexEffort[]
> = {
  'gpt-5.6-sol': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  'gpt-5.6-terra': ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
  'gpt-5.6-luna': ['low', 'medium', 'high', 'xhigh', 'max'],
  'gpt-5.5': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.4': ['low', 'medium', 'high', 'xhigh'],
  'gpt-5.4-mini': ['low', 'medium', 'high', 'xhigh'],
};

export const CODEX_DEFAULT_MODEL = 'gpt-5.6-sol';

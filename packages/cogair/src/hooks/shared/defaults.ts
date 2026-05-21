import type { HookConfig } from './configTypes.js';

export const DEFAULTS: HookConfig = {
  ratio: {
    gemini: { value: 50, enabled: true },
    codex: { value: 50, enabled: true },
  },
  intervention_strength: 0,
  keywords: {
    gemini: 'research, search, youtube, large-context',
    codex: 'code, refactor, sandbox',
  },
  default_model: 'auto',
  default_options: {},
};

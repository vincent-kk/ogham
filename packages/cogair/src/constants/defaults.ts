import type { Config } from '../types/index.js';

export const DEFAULT_CONFIG: Config = {
  ratio: { gemini: 1, codex: 1 },
  intervention_strength: 0,
  keywords: {
    gemini: 'research, search, youtube, large-context',
    codex: 'code, refactor, sandbox',
  },
  default_model: 'auto',
  default_options: {},
  session_ttl_hours: 72,
};

export const DIR_MODE = 0o700;
export const FILE_MODE = 0o600;

export const SETTINGS_SERVER_IDLE_MS = 5 * 60 * 1000;

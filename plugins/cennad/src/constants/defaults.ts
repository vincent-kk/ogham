import { type Config, Tier } from '../types/index.js';

export const DEFAULT_CONFIG: Config = {
  ratio: {
    gemini: { value: 50, enabled: true },
    codex: { value: 50, enabled: true },
    antigravity: { value: 50, enabled: false },
  },
  intervention_strength: 0,
  keywords: {
    gemini: 'research, search, youtube, large-context',
    codex: 'code, refactor, sandbox',
    antigravity: 'research, search, youtube, large-context',
  },
  option_flags: {
    gemini: { yolo: true, sandbox: true, sandbox_backend: 'auto' },
    codex: { yolo: false, sandbox: 'workspace-write' },
    antigravity: { sandbox: false, skip_permissions: false },
  },
  model_map: {
    antigravity: {
      high: 'Gemini 3.1 Pro',
      mid: 'Gemini 3.5 Flash',
      low: 'Gemini 3.5 Flash',
    },
  },
  default_tier: {
    gemini: Tier.Mid,
    codex: Tier.Mid,
    antigravity: Tier.Mid,
  },
  session_ttl_hours: 72,
  spawn_timeout_ms: 10 * 60 * 1000,
  artifacts: {
    enabled: false,
    location: 'project',
  },
  preamble: {
    gemini: '',
    codex: '',
    antigravity: '',
  },
  recency_factor: {
    gemini: 'auto',
    codex: 'off',
    antigravity: 'auto',
  },
  addons: {
    youtube: {
      enabled: false,
      language: 'en',
      targets: { codex: true, antigravity: true },
    },
  },
};

export const DIR_MODE = 0o700;
export const FILE_MODE = 0o600;

export const SETTINGS_SERVER_IDLE_MS = 5 * 60 * 1000;

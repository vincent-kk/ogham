import type { Config } from '../types/config.js';

export const DEFAULT_CONFIG: Config = {
  ratio: {
    codex: { value: 34, enabled: true },
    antigravity: { value: 33, enabled: true },
    claude: { value: 33, enabled: true },
  },
  intervention_strength: 0,
  keywords: {
    codex: 'code, refactor, youtube, create-image',
    antigravity: 'research, search, large-context',
    claude: 'reasoning, writing, analysis, review',
  },
  option_flags: {
    codex: { yolo: false, sandbox: 'workspace-write' },
    antigravity: { sandbox: false, skip_permissions: false },
    claude: { permission_mode: 'dontAsk' },
  },
  model_map: {
    // codex's 5.6 line splits by role: sol = frontier, terra = balanced everyday.
    // high jumps to sol; mid and low ride terra at different efforts.
    codex: {
      high: { model: 'gpt-5.6-sol', effort: 'max' },
      mid: { model: 'gpt-5.6-terra', effort: 'high' },
      low: { model: 'gpt-5.6-terra', effort: 'medium' },
    },
    antigravity: {
      high: 'Gemini 3.1 Pro (High)',
      mid: 'Gemini 3.5 Flash (Medium)',
      low: 'Gemini 3.5 Flash (Low)',
    },
    claude: {
      high: { model: 'opus', effort: 'max' },
      mid: { model: 'opus', effort: 'high' },
      low: { model: 'sonnet', effort: 'high' },
    },
  },
  default_tier: {
    codex: 'mid',
    antigravity: 'mid',
    claude: 'mid',
  },
  session_ttl_hours: 72,
  spawn_timeout_ms: 10 * 60 * 1000,
  artifacts: {
    enabled: false,
    location: 'project',
  },
  preamble: {
    codex: '',
    antigravity: '',
    claude: '',
  },
  recency_factor: {
    codex: 'off',
    antigravity: 'auto',
    claude: 'off',
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

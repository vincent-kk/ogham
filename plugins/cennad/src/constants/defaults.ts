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
    // sandbox + skip_permissions default true as a pair. agy 1.1.3+ auto-denies
    // permission-gated tools in headless -p (empty stdout, exit 0), so
    // skip_permissions is needed for tool-using coding prompts to complete; sandbox
    // keeps that auto-approval inside terminal restrictions (unsandboxed exec stays
    // blocked) — skipping permissions without the sandbox would be an unbounded
    // bypass. agy works in its own scratch, not the user's tree. app.js
    // DEFAULT_OPTION_FLAGS mirrors this.
    antigravity: { sandbox: true, skip_permissions: true },
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
      high: { model: 'Gemini 3.1 Pro', effort: 'High' },
      mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
      low: { model: 'Gemini 3.5 Flash', effort: 'Low' },
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

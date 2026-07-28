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
    // apex and high both ride sol; ultra is sol's delegating effort, the reason
    // apex exists. mid and low ride terra at different efforts.
    codex: {
      apex: { model: 'gpt-5.6-sol', effort: 'ultra' },
      high: { model: 'gpt-5.6-sol', effort: 'max' },
      mid: { model: 'gpt-5.6-terra', effort: 'high' },
      low: { model: 'gpt-5.6-terra', effort: 'medium' },
    },
    // agy tops out at Gemini 3.1 Pro, so apex and high split it by effort the way
    // codex splits terra.
    antigravity: {
      apex: { model: 'Gemini 3.1 Pro', effort: 'High' },
      high: { model: 'Gemini 3.1 Pro', effort: 'Low' },
      mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
      low: { model: 'Gemini 3.5 Flash', effort: 'Low' },
    },
    // apex takes the 1M-context opus: an agentic run reads far more than one turn,
    // and `ultracode` — the top of the scale — makes that run a multi-agent
    // orchestration rather than a deeper single agent. high keeps `max`, so the two
    // tiers differ in kind, not degree.
    claude: {
      apex: { model: 'opus[1m]', effort: 'ultracode' },
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
  timeouts: {
    idle_ms: 10 * 60 * 1000,
    hard_cap_ms: {
      apex: 6 * 60 * 60 * 1000,
      high: 2 * 60 * 60 * 1000,
      mid: 60 * 60 * 1000,
      low: 30 * 60 * 1000,
    },
  },
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
      targets: { claude: false, codex: true, antigravity: true },
    },
  },
};

export const DIR_MODE = 0o700;
export const FILE_MODE = 0o600;

export const SETTINGS_SERVER_IDLE_MS = 5 * 60 * 1000;

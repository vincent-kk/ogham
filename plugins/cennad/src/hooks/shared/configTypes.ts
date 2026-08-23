export type ProviderRatio = {
  value: number;
  enabled: boolean;
  // Opt out of auto-routing while staying available for crosscheck and
  // explicit calls. Absent means false.
  crosscheck_only?: boolean;
};

export type Ratio = {
  codex: ProviderRatio;
  antigravity: ProviderRatio;
  claude: ProviderRatio;
};

export type InterventionStrength = -2 | -1 | 0 | 1 | 2;

export type CodexSandboxMode =
  'read-only' | 'workspace-write' | 'danger-full-access' | 'off';

export interface CodexFlags {
  yolo: boolean;
  sandbox: CodexSandboxMode;
}

export interface AntigravityFlags {
  sandbox: boolean;
  skip_permissions: boolean;
}

export type ClaudePermissionMode =
  'acceptEdits' | 'auto' | 'dontAsk' | 'bypassPermissions';

export interface ClaudeFlags {
  permission_mode: ClaudePermissionMode;
  fallback_model?: string;
}

export interface OptionFlags {
  codex: CodexFlags;
  antigravity: AntigravityFlags;
  claude: ClaudeFlags;
}

export type RecencyLevel = 'off' | 'auto' | 'strict';

export interface PreambleConfig {
  codex: string;
  antigravity: string;
  claude: string;
}

export interface RecencyFactorConfig {
  codex: RecencyLevel;
  antigravity: RecencyLevel;
  claude: RecencyLevel;
}

export interface Keywords {
  codex: string;
  antigravity: string;
  claude: string;
}

export interface HookConfig {
  ratio: Ratio;
  intervention_strength: InterventionStrength;
  keywords: Keywords;
  option_flags: OptionFlags;
  preamble: PreambleConfig;
  recency_factor: RecencyFactorConfig;
}

export interface HookCounter {
  status: 'measured' | 'missing' | 'unidentified' | 'stale' | 'invalid';
  codex: number;
  antigravity: number;
  claude: number;
}

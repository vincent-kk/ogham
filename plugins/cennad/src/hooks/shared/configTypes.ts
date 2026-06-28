export type ProviderRatio = { value: number; enabled: boolean };

export type Ratio = {
  codex: ProviderRatio;
  antigravity: ProviderRatio;
};

export type InterventionStrength = -2 | -1 | 0 | 1 | 2;

export type CodexSandboxMode =
  | 'read-only'
  | 'workspace-write'
  | 'danger-full-access'
  | 'off';

export interface CodexFlags {
  yolo: boolean;
  sandbox: CodexSandboxMode;
}

export interface AntigravityFlags {
  sandbox: boolean;
  skip_permissions: boolean;
}

export interface OptionFlags {
  codex: CodexFlags;
  antigravity: AntigravityFlags;
}

export type RecencyLevel = 'off' | 'auto' | 'strict';

export interface PreambleConfig {
  codex: string;
  antigravity: string;
}

export interface RecencyFactorConfig {
  codex: RecencyLevel;
  antigravity: RecencyLevel;
}

export interface HookConfig {
  ratio: Ratio;
  intervention_strength: InterventionStrength;
  keywords: { codex: string; antigravity: string };
  option_flags: OptionFlags;
  preamble: PreambleConfig;
  recency_factor: RecencyFactorConfig;
}

export interface HookCounter {
  codex: number;
  antigravity: number;
  is_stale: boolean;
}

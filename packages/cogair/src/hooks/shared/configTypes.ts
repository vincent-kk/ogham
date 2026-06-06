export type ProviderRatio = { value: number; enabled: boolean };

export type Ratio = {
  gemini: ProviderRatio;
  codex: ProviderRatio;
  antigravity: ProviderRatio;
};

export type ModelAlias = 'high' | 'mid' | 'low' | 'auto';

export type InterventionStrength = -2 | -1 | 0 | 1 | 2;

export type GeminiSandboxBackend =
  | 'auto'
  | 'docker'
  | 'podman'
  | 'sandbox-exec';

export type CodexSandboxMode =
  | 'read-only'
  | 'workspace-write'
  | 'danger-full-access'
  | 'off';

export interface GeminiFlags {
  yolo: boolean;
  sandbox: boolean;
  sandbox_backend: GeminiSandboxBackend;
}

export interface CodexFlags {
  yolo: boolean;
  sandbox: CodexSandboxMode;
}

export interface AntigravityFlags {
  sandbox: boolean;
  skip_permissions: boolean;
}

export interface OptionFlags {
  gemini: GeminiFlags;
  codex: CodexFlags;
  antigravity: AntigravityFlags;
}

export type RecencyLevel = 'off' | 'auto' | 'strict';

export interface PreambleConfig {
  gemini: string;
  codex: string;
  antigravity: string;
}

export interface RecencyFactorConfig {
  gemini: RecencyLevel;
  codex: RecencyLevel;
  antigravity: RecencyLevel;
}

export interface HookConfig {
  ratio: Ratio;
  intervention_strength: InterventionStrength;
  keywords: { gemini: string; codex: string; antigravity: string };
  default_model: ModelAlias;
  option_flags: OptionFlags;
  preamble: PreambleConfig;
  recency_factor: RecencyFactorConfig;
}

export interface HookCounter {
  gemini: number;
  codex: number;
  antigravity: number;
  is_stale: boolean;
}

export type ProviderRatio = { value: number; enabled: boolean };

export type Ratio = { gemini: ProviderRatio; codex: ProviderRatio };

export type ModelAlias = 'high' | 'mid' | 'low' | 'auto';

export type InterventionStrength = -2 | -1 | 0 | 1 | 2;

export interface HookConfig {
  ratio: Ratio;
  intervention_strength: InterventionStrength;
  keywords: { gemini: string; codex: string };
  default_model: ModelAlias;
  default_options: Record<string, unknown>;
}

export interface HookCounter {
  gemini: number;
  codex: number;
  is_stale: boolean;
}

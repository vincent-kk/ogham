import type { ModelAlias } from '../../types/index.js';

export function resolveCodexModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high':
      return process.env.COGAIR_CODEX_HIGH ?? 'gpt-5-codex';
    case 'mid':
      return process.env.COGAIR_CODEX_MID ?? 'gpt-5.1-codex';
    case 'low':
      return process.env.COGAIR_CODEX_LOW ?? 'o3';
    case 'auto':
      return null;
  }
}

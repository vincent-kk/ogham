import type { ModelAlias } from '../../../types/index.js';

export function resolveCodexModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high':
      return process.env.CENNAD_CODEX_HIGH ?? null;
    case 'mid':
      return process.env.CENNAD_CODEX_MID ?? null;
    case 'low':
      return process.env.CENNAD_CODEX_LOW ?? null;
    case 'auto':
      return null;
  }
}

import type { ModelAlias } from '../../../types/index.js';

export function resolveGeminiModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high':
      return process.env.CENNAD_GEMINI_HIGH ?? 'pro';
    case 'mid':
      return process.env.CENNAD_GEMINI_MID ?? 'flash';
    case 'low':
      return process.env.CENNAD_GEMINI_LOW ?? 'flash-lite';
    case 'auto':
      return null;
  }
}

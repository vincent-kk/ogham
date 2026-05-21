import type { ModelAlias } from '../../types/index.js';

export function resolveGeminiModel(alias: ModelAlias): string | null {
  switch (alias) {
    case 'high':
      return process.env.COGAIR_GEMINI_HIGH ?? 'gemini-2.5-pro';
    case 'mid':
      return process.env.COGAIR_GEMINI_MID ?? 'gemini-2.5-flash';
    case 'low':
      return process.env.COGAIR_GEMINI_LOW ?? 'gemini-2.5-flash-lite';
    case 'auto':
      return null;
  }
}

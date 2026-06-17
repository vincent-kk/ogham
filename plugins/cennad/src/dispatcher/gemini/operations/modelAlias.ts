import { ModelAlias } from '../../../types/index.js';

export function resolveGeminiModel(alias: ModelAlias): string | null {
  switch (alias) {
    case ModelAlias.High:
      return process.env.CENNAD_GEMINI_HIGH ?? 'pro';
    case ModelAlias.Mid:
      return process.env.CENNAD_GEMINI_MID ?? 'flash';
    case ModelAlias.Low:
      return process.env.CENNAD_GEMINI_LOW ?? 'flash-lite';
  }
}

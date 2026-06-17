import { Tier } from '../../../types/index.js';

export function resolveGeminiModel(tier: Tier): string | null {
  switch (tier) {
    case Tier.High:
      return process.env.CENNAD_GEMINI_HIGH ?? 'pro';
    case Tier.Mid:
      return process.env.CENNAD_GEMINI_MID ?? 'flash';
    case Tier.Low:
      return process.env.CENNAD_GEMINI_LOW ?? 'flash-lite';
  }
}

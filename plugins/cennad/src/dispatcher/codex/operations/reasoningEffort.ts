import { Tier } from '../../../types/index.js';

// Codex serves a single coding model; tiers map to reasoning effort, not model
// names.
export function resolveCodexEffort(tier: Tier): string | null {
  switch (tier) {
    case Tier.High:
      return 'high';
    case Tier.Mid:
      return 'medium';
    case Tier.Low:
      return 'low';
  }
}

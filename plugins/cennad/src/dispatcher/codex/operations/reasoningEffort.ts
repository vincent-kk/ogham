import { ModelAlias } from '../../../types/index.js';

// Codex serves a single coding model; tiers map to reasoning effort, not model
// names.
export function resolveCodexEffort(alias: ModelAlias): string | null {
  switch (alias) {
    case ModelAlias.High:
      return 'high';
    case ModelAlias.Mid:
      return 'medium';
    case ModelAlias.Low:
      return 'low';
  }
}

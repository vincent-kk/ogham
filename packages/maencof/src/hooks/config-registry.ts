import { DEFAULT_INSIGHT_CONFIG, DEFAULT_INSIGHT_STATS } from '../types/insight.js';
import {
  DEFAULT_VAULT_COMMIT_CONFIG,
  DEFAULT_LIFECYCLE_CONFIG,
  DEFAULT_DATA_SOURCES_CONFIG_FACTORY,
  DEFAULT_USAGE_STATS,
} from '../types/config-defaults.js';

export interface ConfigEntry {
  /** Filename within .maencof-meta/ */
  filename: string;
  /** Default value factory (JSON-serializable) */
  defaultValue: () => Record<string, unknown>;
}

export const CONFIG_REGISTRY: ConfigEntry[] = [
  {
    filename: 'insight-config.json',
    defaultValue: () => ({ ...DEFAULT_INSIGHT_CONFIG }),
  },
  {
    filename: 'auto-insight-stats.json',
    defaultValue: () => ({
      ...DEFAULT_INSIGHT_STATS,
      updatedAt: new Date().toISOString(), // fresh timestamp
    }),
  },
  {
    filename: 'vault-commit.json',
    defaultValue: () => ({ ...DEFAULT_VAULT_COMMIT_CONFIG }),
  },
  {
    filename: 'lifecycle.json',
    defaultValue: () => ({ ...DEFAULT_LIFECYCLE_CONFIG, actions: [] }), // fresh array
  },
  {
    filename: 'data-sources.json',
    defaultValue: DEFAULT_DATA_SOURCES_CONFIG_FACTORY,
  },
  {
    filename: 'usage-stats.json',
    defaultValue: () => ({ ...DEFAULT_USAGE_STATS }),
  },
];

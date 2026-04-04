import {
  DEFAULT_DATA_SOURCES_CONFIG_FACTORY,
  DEFAULT_LIFECYCLE_CONFIG,
  DEFAULT_USAGE_STATS,
  DEFAULT_VAULT_COMMIT_CONFIG,
} from '../../types/config-defaults.js';
import {
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
} from '../../types/insight.js';

export interface ConfigEntry {
  /** Filename within .maencof-meta/ */
  filename: string;
  /** Schema version for migration detection. Missing means migration skip. */
  schemaVersion?: number;
  /** Default value factory (JSON-serializable) */
  defaultValue: () => Record<string, unknown>;
}

export const CONFIG_REGISTRY: ConfigEntry[] = [
  {
    filename: 'insight-config.json',
    schemaVersion: 1,
    defaultValue: () => ({ ...DEFAULT_INSIGHT_CONFIG, _schemaVersion: 1 }),
  },
  {
    filename: 'auto-insight-stats.json',
    schemaVersion: 1,
    defaultValue: () => ({
      ...DEFAULT_INSIGHT_STATS,
      updatedAt: new Date().toISOString(), // fresh timestamp
      _schemaVersion: 1,
    }),
  },
  {
    filename: 'vault-commit.json',
    schemaVersion: 1,
    defaultValue: () => ({ ...DEFAULT_VAULT_COMMIT_CONFIG, _schemaVersion: 1 }),
  },
  {
    filename: 'lifecycle.json',
    schemaVersion: 1,
    defaultValue: () => ({
      ...DEFAULT_LIFECYCLE_CONFIG,
      actions: [],
      _schemaVersion: 1,
    }), // fresh array
  },
  {
    filename: 'data-sources.json',
    schemaVersion: 1,
    defaultValue: () => ({
      ...DEFAULT_DATA_SOURCES_CONFIG_FACTORY(),
      _schemaVersion: 1,
    }),
  },
  {
    filename: 'usage-stats.json',
    // No schemaVersion — Record<string, number> type incompatible with _schemaVersion metadata
    defaultValue: () => ({ ...DEFAULT_USAGE_STATS }),
  },
];

import type { LifecycleConfig } from '../types/lifecycle.js';

export interface VaultCommitConfigDefault {
  enabled: boolean;
}

export const DEFAULT_VAULT_COMMIT_CONFIG: VaultCommitConfigDefault = {
  enabled: false,
};

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  version: 1,
  actions: [],
};

export interface DataSourcesFileConfig extends Record<string, unknown> {
  sources: unknown[];
  updatedAt: string;
}

export const DEFAULT_DATA_SOURCES_CONFIG_FACTORY =
  (): DataSourcesFileConfig => ({
    sources: [],
    updatedAt: new Date().toISOString(),
  });

export const DEFAULT_USAGE_STATS: Record<string, number> = {};

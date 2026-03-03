import type { LifecycleConfig } from './lifecycle.js';

/**
 * Default vault-commit config. Opt-in feature — disabled by default.
 * Minimal interface defined here to avoid types/ -> hooks/ import direction violation.
 * Matches the VaultCommitConfig interface in hooks/vault-committer.ts.
 */
export interface VaultCommitConfigDefault {
  enabled: boolean;
}

export const DEFAULT_VAULT_COMMIT_CONFIG: VaultCommitConfigDefault = {
  enabled: false,
};

/**
 * Default lifecycle config. Empty action list.
 */
export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  version: 1,
  actions: [],
};

/**
 * Default data-sources config. No connected sources.
 */
export interface DataSourcesFileConfig extends Record<string, unknown> {
  sources: unknown[];
  updatedAt: string;
}

export const DEFAULT_DATA_SOURCES_CONFIG_FACTORY = (): DataSourcesFileConfig => ({
  sources: [],
  updatedAt: new Date().toISOString(),
});

/**
 * Default usage-stats config. Empty tool call counts.
 * This is the per-tool Record<string, number> used by index-invalidator,
 * NOT the richer UsageStats interface from types/session.ts.
 */
export const DEFAULT_USAGE_STATS: Record<string, number> = {};

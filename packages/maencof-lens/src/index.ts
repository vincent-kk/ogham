/**
 * @file index.ts
 * @description @ogham/maencof-lens public API entry point
 */

export { VERSION } from './version.js';

// Config
export { loadConfig, writeConfig, createDefaultConfig } from './config/config-loader/config-loader.js';
export { LensConfigSchema, VaultConfigSchema } from './config/config-schema/config-schema.js';
export type { LensConfig, VaultConfig } from './config/config-schema/config-schema.js';
export { DEFAULT_LAYERS, CONFIG_DIR, CONFIG_FILE } from './config/defaults/defaults.js';

// Vault
export { VaultRouter } from './vault/vault-router/vault-router.js';
export { GraphCache } from './vault/graph-cache/graph-cache.js';
export { detectStale } from './vault/stale-detector/stale-detector.js';
export type { StaleInfo } from './vault/stale-detector/stale-detector.js';

// Filter
export { computeEffectiveLayers, filterResultsByLayer } from './filter/layer-guard/layer-guard.js';

// MCP
export { createLensServer } from './mcp/server/server.js';

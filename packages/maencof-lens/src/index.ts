/**
 * @file index.ts
 * @description @ogham/maencof-lens public API entry point
 */

export { VERSION } from './version.js';

// Config
export { loadConfig, writeConfig, createDefaultConfig } from './config/config-loader.js';
export { LensConfigSchema, VaultConfigSchema } from './config/config-schema.js';
export type { LensConfig, VaultConfig } from './config/config-schema.js';
export { DEFAULT_LAYERS, CONFIG_DIR, CONFIG_FILE } from './config/defaults.js';

// Vault
export { VaultRouter } from './vault/vault-router.js';
export { GraphCache } from './vault/graph-cache.js';
export { detectStale } from './vault/stale-detector.js';
export type { StaleInfo } from './vault/stale-detector.js';

// Filter
export { computeEffectiveLayers, filterResultsByLayer } from './filter/layer-guard.js';

// MCP
export { createLensServer } from './mcp/server.js';

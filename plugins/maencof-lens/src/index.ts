/**
 * @file index.ts
 * @description @ogham/maencof-lens public API entry point
 */

export { VERSION } from "./version.js";

// Config
export {
  loadConfig,
  writeConfig,
  createDefaultConfig,
} from "./config/configLoader/configLoader.js";
export {
  LensConfigSchema,
  VaultConfigSchema,
} from "./config/configSchema/configSchema.js";
export type {
  LensConfig,
  VaultConfig,
} from "./config/configSchema/configSchema.js";
export {
  DEFAULT_LAYERS,
  CONFIG_DIR,
  CONFIG_FILE,
} from "./config/defaults/defaults.js";

// Vault
export { VaultRouter } from "./vault/vaultRouter/vaultRouter.js";
export { GraphCache } from "./vault/graphCache/graphCache.js";
export { detectStale } from "./vault/staleDetector/staleDetector.js";
export type { StaleInfo } from "./vault/staleDetector/staleDetector.js";

// Filter
export {
  computeEffectiveLayers,
  filterResultsByLayer,
} from "./filter/layerGuard/layerGuard.js";

// MCP
export { createLensServer } from "./mcp/server/server.js";

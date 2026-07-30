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
} from "./config/configLoader/index.js";
export {
  LensConfigSchema,
  VaultConfigSchema,
} from "./config/configSchema/index.js";
export type {
  LensConfig,
  VaultConfig,
} from "./config/configSchema/index.js";
export {
  DEFAULT_LAYERS,
  CONFIG_DIR,
  CONFIG_FILE,
} from "./config/defaults/index.js";

// Vault
export { VaultRouter } from "./vault/vaultRouter/index.js";
export { GraphCache } from "./vault/graphCache/index.js";
export { detectStale } from "./vault/staleDetector/index.js";
export type { StaleInfo } from "./vault/staleDetector/index.js";

// Filter
export {
  computeEffectiveLayers,
  filterResultsByLayer,
} from "./filter/layerGuard/index.js";

// MCP 는 여기서 재노출하지 않는다. 실행 진입점은 esbuild 가 `mcp/serverEntry/` 로부터
// 만드는 번들이고, `mcp/server/server.ts` 가 `version.ts` 를 참조하므로 재노출하면
// src → mcp/server → src 의존 순환이 된다.

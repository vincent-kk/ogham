export {
  loadConfig,
  writeConfig,
  createDefaultConfig,
} from "./configLoader/index.js";
export { VaultConfigSchema, LensConfigSchema } from "./configSchema/index.js";
export type { VaultConfig, LensConfig } from "./configSchema/index.js";
export {
  DEFAULT_LAYERS,
  CONFIG_DIR,
  CONFIG_FILE,
  CONFIG_VERSION,
} from "./defaults/index.js";

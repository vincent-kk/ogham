export {
  buildConfigScopeState,
  readConfigLayers,
  resolveConfigLayers,
  writeConfigLayer,
} from "./layers/index.js";
export {
  clearConfigPaths,
  FORBIDDEN_KEYS,
  isPlainObject,
  listOverriddenPaths,
  mergeConfigLayers,
} from "./merge/index.js";
export type {
  ConfigLayerDocuments,
  ConfigLayerPaths,
  ConfigScope,
  ConfigScopeState,
  ResolveConfigLayersOptions,
} from "./types/types.js";

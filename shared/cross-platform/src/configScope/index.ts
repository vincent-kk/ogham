export {
  buildConfigScopeState,
  readConfigLayers,
  resolveConfigLayers,
  resolveInitialConfigScope,
  writeConfigLayer,
} from "./layers/index.js";
export {
  clearConfigPaths,
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

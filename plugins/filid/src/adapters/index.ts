export {
  createAdapterRegistry,
  getDefaultAdapterIds,
} from './registry/createAdapterRegistry.js';
export type { InitialAdapters } from './registry/createAdapterRegistry.js';
export {
  resolveAdapters,
  type ResolveAdaptersOptions,
} from './registry/resolveAdapters.js';
export {
  ECMASCRIPT_ADAPTER_ID,
  ecmascriptStructureAdapter,
  ecmascriptVerificationAdapter,
} from './ecmascript/index.js';

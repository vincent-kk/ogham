export {
  createAdapterRegistry,
  getDefaultAdapterIds,
} from './registry/createAdapterRegistry.js';
export type { InitialAdapters } from './registry/createAdapterRegistry.js';
export { resolveAdapters } from './registry/resolveAdapters.js';
export {
  ECMASCRIPT_ADAPTER_ID,
  ecmascriptStructureAdapter,
  ecmascriptVerificationAdapter,
} from './ecmascript/index.js';

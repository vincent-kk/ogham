export {
  computeChangeSet,
  computeOneHopNeighbors,
  computeIncrementalScope,
  createSnapshot,
  IncrementalTracker,
} from "./incrementalTracker/index.js";
export type {
  ChangeSet,
  CurrentFileInfo,
  IncrementalScope,
} from "./incrementalTracker/index.js";
export {
  serializeGraph,
  deserializeGraph,
  deserializeShards,
  MetadataStore,
  CACHE_FILES,
  atomicWriteJson,
  withVaultLock,
} from "./metadataStore/index.js";
export type {
  AtomicWriteOptions,
  FileSnapshot,
  SnapshotEntry,
  StaleEntries,
  StaleEntry,
  WeightsData,
} from "./metadataStore/index.js";

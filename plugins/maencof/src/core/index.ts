export * from './activityLog/index.js';
export * from './architectureMigrator/index.js';
export * from './autonomy/index.js';
export * from './backupPath/index.js';
export * from './changelogState/index.js';
export * from './claudeMdMerger/index.js';
export * from './companionBudget/index.js';
export * from './companionEdit/index.js';
export * from './companionMigration/index.js';
export * from './companionNormalize/index.js';
export * from './communityDetector/index.js';
export * from './contentDedup/index.js';
export * from './dagConverter/index.js';
export * from './dateFormat/index.js';
export * from './dialogueConfig/index.js';
export * from './errorLog/index.js';
export * from './documentParser/index.js';
export * from './filenameSlug/index.js';
export * from './graphBuilder/index.js';
export * from './insightStats/index.js';
export * from './pathGuard/index.js';
export * from './sessionStore/index.js';
export * from './spreadingActivation/index.js';
export * from './transitionHistory/index.js';
export * from './tagSimilarity/index.js';
export * from './vaultScanner/index.js';
export * from './weightCalculator/index.js';
export * from './workIndex/index.js';
export * from './yamlParser/index.js';
// indexer re-exports exclude names that collide with vault-scanner
export {
  serializeGraph,
  deserializeGraph,
  MetadataStore,
  CACHE_FILES,
  type SnapshotEntry,
  type WeightsData,
  type StaleEntry,
  type StaleEntries,
  computeOneHopNeighbors,
  computeIncrementalScope,
  IncrementalTracker,
  type IncrementalScope,
  type CurrentFileInfo,
} from './indexer/index.js';

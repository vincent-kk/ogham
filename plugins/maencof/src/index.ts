/**
 * @file index.ts
 * @description @ogham/maencof 공개 API 엔트리포인트
 */

export * from './types/index.js';
export { VERSION } from './version.js';

// Core modules
export {
  scanVault,
  buildSnapshot,
  computeChangeSet,
  scanIncrementalChanges,
  readVaultFile,
} from './core/vaultScanner/vaultScanner.js';
export type {
  ScannedFile,
  FileSnapshot,
  ChangeSet,
  VaultScanOptions,
} from './core/vaultScanner/vaultScanner.js';

export {
  parseYamlFrontmatter,
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
  parseDocumentFromFile,
} from './core/documentParser/documentParser.js';
export type {
  MarkdownLink,
  ParsedDocument,
  NodeBuildResult,
} from './core/documentParser/documentParser.js';

export {
  buildGraph,
  buildAdjacencyList,
  detectOrphans,
} from './core/graphBuilder/graphBuilder.js';
export type {
  GraphBuilderOptions,
  GraphBuildResult,
} from './core/graphBuilder/graphBuilder.js';

export {
  convertToDAG,
  applyLayerDirectionality,
} from './core/dagConverter/dagConverter.js';
export type { DAGConvertResult } from './core/dagConverter/dagConverter.js';

export {
  calculateWeights,
  computePageRank,
  normalizeWeights,
  getLayerDecay,
  LAYER_DECAY_FACTORS,
} from './core/weightCalculator/weightCalculator.js';
export type { WeightCalcResult } from './core/weightCalculator/weightCalculator.js';

export { runAccumulativeActivation } from './core/spreadingActivation/accumulativeActivation.js';
export type { AccumulativeActivationParams } from './core/spreadingActivation/accumulativeActivation.js';

export {
  CommunityDetector,
  detectCommunities,
} from './core/communityDetector/communityDetector.js';
export type {
  Community,
  CommunityDetectionResult,
  CommunityDetectorParams,
} from './core/communityDetector/communityDetector.js';

export {
  mergeMaencofSection,
  readMaencofSection,
  removeMaencofSection,
  ClaudeMdMerger,
  MAENCOF_START_MARKER,
  MAENCOF_END_MARKER,
} from './core/claudeMdMerger/claudeMdMerger.js';
export type { MergeResult } from './core/claudeMdMerger/claudeMdMerger.js';

export { deduplicateContent } from './core/contentDedup/contentDedup.js';
export type { DeduplicateResult } from './core/contentDedup/contentDedup.js';

// Search modules
export {
  query,
  resolveSeedNodes,
  QueryEngine,
  invalidateQueryCache,
} from './search/queryEngine/queryEngine.js';
export type {
  QueryOptions,
  QueryResult,
  ScoredSeed,
  MatchType,
} from './search/queryEngine/queryEngine.js';

export {
  assembleContext,
  extractBestSnippet,
  ContextAssembler,
} from './search/contextAssembler/contextAssembler.js';
export type {
  ContextItem,
  AssembleOptions,
  AssembledContext,
} from './search/contextAssembler/contextAssembler.js';

// Index modules
export {
  serializeGraph,
  deserializeGraph,
  MetadataStore,
  CACHE_FILES,
} from './core/indexer/metadataStore/metadataStore.js';
export type {
  SnapshotEntry,
  FileSnapshot as CacheSnapshot,
  WeightsData,
  StaleEntry,
  StaleEntries,
} from './core/indexer/metadataStore/metadataStore.js';

export {
  computeChangeSet as computeIncrementalChangeSet,
  computeOneHopNeighbors,
  computeIncrementalScope,
  createSnapshot as createIncrementalSnapshot,
  IncrementalTracker,
} from './core/indexer/incrementalTracker/incrementalTracker.js';
export type {
  ChangeSet as IncrementalChangeSet,
  IncrementalScope,
  CurrentFileInfo,
} from './core/indexer/incrementalTracker/incrementalTracker.js';

// MCP modules
export {
  createServer,
  startServer,
  removeBacklinks,
  getBacklinks,
  toolResult,
  toolError,
  mapReplacer,
  handleMaencofCreate,
  handleMaencofRead,
  handleMaencofUpdate,
  handleMaencofDelete,
  handleMaencofMove,
  handleKgSearch,
  handleKgNavigate,
  handleKgContext,
  handleKgStatus,
  handleKgBuild,
} from './mcp/index.js';
export type { KgBuildInput, KgBuildResult } from './mcp/index.js';

// MCP middlewares
export { mergeStaleNodesIntoGraph } from './mcp/server/middlewares/index.js';

// Public policy constants
export { READ_REINDEX_CAP } from './constants/thresholds.js';

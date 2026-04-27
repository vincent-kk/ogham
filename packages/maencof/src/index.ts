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
} from './core/vault-scanner/vault-scanner.js';
export type {
  ScannedFile,
  FileSnapshot,
  ChangeSet,
  VaultScanOptions,
} from './core/vault-scanner/vault-scanner.js';

export {
  parseYamlFrontmatter,
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
  parseDocumentFromFile,
} from './core/document-parser/document-parser.js';
export type {
  MarkdownLink,
  ParsedDocument,
  NodeBuildResult,
} from './core/document-parser/document-parser.js';

export {
  buildGraph,
  buildAdjacencyList,
  detectOrphans,
} from './core/graph-builder/graph-builder.js';
export type {
  GraphBuilderOptions,
  GraphBuildResult,
} from './core/graph-builder/graph-builder.js';

export {
  convertToDAG,
  applyLayerDirectionality,
} from './core/dag-converter/dag-converter.js';
export type { DAGConvertResult } from './core/dag-converter/dag-converter.js';

export {
  calculateWeights,
  computePageRank,
  normalizeWeights,
  getLayerDecay,
  LAYER_DECAY_FACTORS,
} from './core/weight-calculator/weight-calculator.js';
export type { WeightCalcResult } from './core/weight-calculator/weight-calculator.js';

export {
  runSpreadingActivation,
  SpreadingActivationEngine,
} from './core/spreading-activation/spreading-activation.js';
export type { SpreadingActivationParams } from './core/spreading-activation/spreading-activation.js';

export {
  CommunityDetector,
  detectCommunities,
} from './core/community-detector/community-detector.js';
export type {
  Community,
  CommunityDetectionResult,
  CommunityDetectorParams,
} from './core/community-detector/community-detector.js';

export {
  mergeMaencofSection,
  readMaencofSection,
  removeMaencofSection,
  ClaudeMdMerger,
  MAENCOF_START_MARKER,
  MAENCOF_END_MARKER,
} from './core/claude-md-merger/claude-md-merger.js';
export type { MergeResult } from './core/claude-md-merger/claude-md-merger.js';

export { deduplicateContent } from './core/content-dedup/content-dedup.js';
export type { DeduplicateResult } from './core/content-dedup/content-dedup.js';

// Search modules
export {
  query,
  resolveSeedNodes,
  QueryEngine,
  invalidateQueryCache,
} from './search/query-engine/query-engine.js';
export type {
  QueryOptions,
  QueryResult,
  ScoredSeed,
  MatchType,
} from './search/query-engine/query-engine.js';

export {
  assembleContext,
  extractBestSnippet,
  ContextAssembler,
} from './search/context-assembler/context-assembler.js';
export type {
  ContextItem,
  AssembleOptions,
  AssembledContext,
} from './search/context-assembler/context-assembler.js';

// Index modules
export {
  serializeGraph,
  deserializeGraph,
  MetadataStore,
  CACHE_FILES,
} from './core/indexer/metadata-store/metadata-store.js';
export type {
  SnapshotEntry,
  FileSnapshot as CacheSnapshot,
  WeightsData,
  StaleNodes,
} from './core/indexer/metadata-store/metadata-store.js';

export {
  computeChangeSet as computeIncrementalChangeSet,
  computeOneHopNeighbors,
  computeIncrementalScope,
  createSnapshot as createIncrementalSnapshot,
  IncrementalTracker,
} from './core/indexer/incremental-tracker/incremental-tracker.js';
export type {
  ChangeSet as IncrementalChangeSet,
  IncrementalScope,
  CurrentFileInfo,
} from './core/indexer/incremental-tracker/incremental-tracker.js';

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

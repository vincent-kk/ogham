/**
 * @file index.ts
 * @description @ogham/coffaen 공개 API 엔트리포인트
 */

export * from './types/index.js';
export { VERSION } from './version.js';

// Core modules
export {
  scanVault,
  buildSnapshot,
  computeChangeSet,
  scanIncrementalChanges,
} from './core/vault-scanner.js';
export type {
  ScannedFile,
  FileSnapshot,
  ChangeSet,
  VaultScanOptions,
} from './core/vault-scanner.js';

export {
  parseYamlFrontmatter,
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
  parseDocumentFromFile,
} from './core/document-parser.js';
export type {
  MarkdownLink,
  ParsedDocument,
  NodeBuildResult,
} from './core/document-parser.js';

export {
  buildGraph,
  buildAdjacencyList,
  detectOrphans,
} from './core/graph-builder.js';
export type { GraphBuilderOptions, GraphBuildResult } from './core/graph-builder.js';

export {
  convertToDAG,
  applyLayerDirectionality,
} from './core/dag-converter.js';
export type { DAGConvertResult } from './core/dag-converter.js';

export {
  calculateWeights,
  computePageRank,
  normalizeWeights,
  getLayerDecay,
  LAYER_DECAY_FACTORS,
} from './core/weight-calculator.js';
export type { WeightCalcResult } from './core/weight-calculator.js';

export {
  runSpreadingActivation,
  SpreadingActivationEngine,
} from './core/spreading-activation.js';
export type { SpreadingActivationParams } from './core/spreading-activation.js';

export {
  CommunityDetector,
  detectCommunities,
} from './core/community-detector.js';
export type {
  Community,
  CommunityDetectionResult,
  CommunityDetectorParams,
} from './core/community-detector.js';

export {
  mergeCoffaenSection,
  readCoffaenSection,
  removeCoffaenSection,
  ClaudeMdMerger,
  COFFAEN_START_MARKER,
  COFFAEN_END_MARKER,
} from './core/claude-md-merger.js';
export type { MergeResult } from './core/claude-md-merger.js';

// Search modules
export { query, resolveSeedNodes, QueryEngine } from './search/query-engine.js';
export type { QueryOptions, QueryResult } from './search/query-engine.js';

export { assembleContext, ContextAssembler } from './search/context-assembler.js';
export type {
  ContextItem,
  AssembleOptions,
  AssembledContext,
} from './search/context-assembler.js';

// Index modules
export {
  serializeGraph,
  deserializeGraph,
  MetadataStore,
  CACHE_FILES,
} from './index/metadata-store.js';
export type {
  SnapshotEntry,
  FileSnapshot as CacheSnapshot,
  WeightsData,
  StaleNodes,
} from './index/metadata-store.js';

export {
  computeChangeSet as computeIncrementalChangeSet,
  computeOneHopNeighbors,
  computeIncrementalScope,
  createSnapshot as createIncrementalSnapshot,
  IncrementalTracker,
} from './index/incremental-tracker.js';
export type {
  ChangeSet as IncrementalChangeSet,
  IncrementalScope,
  CurrentFileInfo,
} from './index/incremental-tracker.js';

// MCP modules
export { createServer, startServer } from './mcp/server.js';
export { appendStaleNode, removeBacklinks, getBacklinks, toolResult, toolError, mapReplacer } from './mcp/shared.js';
export { handleCoffaenCreate } from './mcp/tools/coffaen-create.js';
export { handleCoffaenRead } from './mcp/tools/coffaen-read.js';
export { handleCoffaenUpdate } from './mcp/tools/coffaen-update.js';
export { handleCoffaenDelete } from './mcp/tools/coffaen-delete.js';
export { handleCoffaenMove } from './mcp/tools/coffaen-move.js';
export { handleKgSearch } from './mcp/tools/kg-search.js';
export { handleKgNavigate } from './mcp/tools/kg-navigate.js';
export { handleKgContext } from './mcp/tools/kg-context.js';
export { handleKgStatus } from './mcp/tools/kg-status.js';
export { handleKgBuild } from './mcp/tools/kg-build.js';
export type { KgBuildInput, KgBuildResult } from './mcp/tools/kg-build.js';

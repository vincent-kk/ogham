export {
  getActivityEventsDir,
  getActivityEventPath,
  appendActivityEvent,
  readActivityEvents,
  buildToolDescription,
} from "./activityLog/index.js";
export {
  checkArchitectureVersion,
  classifyL3Document,
  planMigration,
  executeMigration,
  rollbackMigration,
} from "./architectureMigrator/index.js";
export {
  canAutoExecute,
  readAutonomyLevel,
  setAutonomyLevel,
} from "./autonomy/index.js";
export { backupPathFor } from "./backupPath/index.js";
export {
  changelogStatePath,
  readChangelogState,
  writeChangelogState,
} from "./changelogState/index.js";
export {
  MAENCOF_START_MARKER,
  MAENCOF_END_MARKER,
  mergeMaencofSection,
  readMaencofSection,
  removeMaencofSection,
  ClaudeMdMerger,
  createProjectInstructionManager,
} from "./claudeMdMerger/index.js";
export type { MergeResult } from "./claudeMdMerger/index.js";
export {
  measureTurnChars,
  measureSessionChars,
  assertTurnBudget,
  assertSessionBudget,
  checkBriefSubsumption,
} from "./companionBudget/index.js";
export type {
  BudgetOffender,
  BudgetResult,
  BriefSubsumptionResult,
} from "./companionBudget/index.js";
export { applyCompanionEdit } from "./companionEdit/index.js";
export { runCompanionMigration } from "./companionMigration/index.js";
export type {
  CompanionMigrationResult,
  CompanionMigrationReason,
} from "./companionMigration/index.js";
export {
  normalizeCompanionIdentity,
  toIsoDatetime,
} from "./companionNormalize/index.js";
export {
  CommunityDetector,
  detectCommunities,
} from "./communityDetector/index.js";
export type {
  Community,
  CommunityDetectionResult,
  CommunityDetectorParams,
} from "./communityDetector/index.js";
export { deduplicateContent } from "./contentDedup/index.js";
export type { DeduplicateResult } from "./contentDedup/index.js";
export {
  convertToDAG,
  applyLayerDirectionality,
} from "./dagConverter/index.js";
export type { DAGConvertResult } from "./dagConverter/index.js";
export { formatDate, formatTime, isDateInWindow } from "./dateFormat/index.js";
export {
  isDialogueInjectionDisabled,
  readDialogueConfig,
  writeDialogueConfig,
} from "./dialogueConfig/index.js";
export {
  appendErrorLog,
  appendErrorLogSafe,
  readErrorLog,
} from "./errorLog/index.js";
export type { ErrorLogEntry } from "./errorLog/index.js";
export {
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
  inferSubLayerFromPath,
  parseDocumentFromFile,
  parseScalarValue,
  parseYamlFrontmatter,
} from "./documentParser/index.js";
export type {
  MarkdownLink,
  NodeBuildResult,
  ParsedDocument,
} from "./documentParser/index.js";
export { sanitizeSegment } from "./filenameSlug/index.js";
export {
  buildGraph,
  buildAdjacencyList,
  deriveSiblingEdges,
  detectOrphans,
  hydrateRuntimeMaps,
  rebuildEdgeDerivedMaps,
  tokenizeForInvertedIndex,
  addNodeToInvertedIndex,
  removeNodeFromInvertedIndex,
  buildInvertedIndex,
} from "./graphBuilder/index.js";
export type {
  GraphBuilderOptions,
  GraphBuildResult,
} from "./graphBuilder/index.js";
export {
  appendPendingCapture,
  autoAdjustSensitivity,
  buildMetaPrompt,
  calculatePrecision,
  deletePendingNotification,
  getSessionCaptureCount,
  incrementInsightStats,
  readInsightConfig,
  readInsightStats,
  readPendingNotification,
  updatePromotionStats,
  writeInsightConfig,
} from "./insightStats/index.js";
export { resolveWithinVault } from "./pathGuard/index.js";
export type { VaultPathResolution } from "./pathGuard/index.js";
export {
  getSessionsDir,
  getSessionDayPath,
  recordSessionStart,
  readSessionDayLog,
  getRecentSessionSummary,
  sweepStaleSessions,
} from "./sessionStore/index.js";
export { runAccumulativeActivation } from "./spreadingActivation/index.js";
export type {
  AccumulativeActivationParams,
} from "./spreadingActivation/index.js";
export {
  appendTransition,
  getRejectCount,
  readTransitionHistory,
} from "./transitionHistory/index.js";
export {
  normalizeTags,
  jaccardSimilarity,
  extractKeywords,
  commonTags,
} from "./tagSimilarity/index.js";
export {
  scanVault,
  scanArchive,
  buildSnapshot,
  computeChangeSet,
  readVaultFile,
  scanIncrementalChanges,
} from "./vaultScanner/index.js";
export type {
  ChangeSet,
  FileSnapshot,
  ScannedFile,
  VaultScanOptions,
} from "./vaultScanner/index.js";
export {
  HUB_DECAY_FACTOR,
  LAYER_DECAY_FACTORS,
  SUBLAYER_DECAY_FACTORS,
  calculateWeights,
  computePageRank,
  normalizeWeights,
  getLayerDecay,
} from "./weightCalculator/index.js";
export type { WeightCalcResult } from "./weightCalculator/index.js";
export {
  inferTopicsLayers,
  getDigestsDir,
  getDailyDigestPath,
  buildDailyDigest,
  readDailyDigest,
  listDailyDigestDates,
  aggregatePeriod,
  queryWork,
} from "./workIndex/index.js";
export { quoteYamlValue } from "./yamlParser/index.js";
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

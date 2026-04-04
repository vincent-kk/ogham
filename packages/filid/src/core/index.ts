// core barrel — re-exports all public APIs from sub-modules

// tree
export {
  buildFractalTree,
  findNode,
  getAncestors,
  getDescendants,
  getFractalsUnderOrgans,
  scanProject,
  shouldExclude,
} from './tree/fractal-tree/fractal-tree.js';
export type { NodeEntry } from './tree/fractal-tree/fractal-tree.js';
export {
  classifyNode,
  isInfraOrgDirectoryByPattern,
  KNOWN_ORGAN_DIR_NAMES,
} from './tree/organ-classifier/organ-classifier.js';
export type { ClassifyInput } from './tree/organ-classifier/organ-classifier.js';
export { buildChain, findBoundary } from './tree/boundary-detector/boundary-detector.js';
export type { ChainResult } from './tree/boundary-detector/boundary-detector.js';

// rules
export {
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from './rules/rule-engine/rule-engine.js';
export {
  validateDependencies,
  validateNode,
  validateStructure,
} from './rules/fractal-validator/fractal-validator.js';
export {
  countLines,
  detectAppendOnly,
  validateDetailMd,
  validateIntentMd,
} from './rules/document-validator/document-validator.js';
export {
  SEVERITY_ORDER,
  calculateSeverity,
  compareCurrent,
  detectDrift,
  generateSyncPlan,
} from './rules/drift-detector/drift-detector.js';

// analysis
export {
  analyzeProject,
  calculateHealthScore,
  generateReport,
} from './analysis/project-analyzer/project-analyzer.js';
export {
  buildDAG,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
} from './analysis/dependency-graph/dependency-graph.js';
export {
  findLCA,
  getAncestorPaths,
  getModulePlacement,
} from './analysis/lca-calculator/lca-calculator.js';

// module
export { analyzeIndex, extractModuleExports } from './module/index-analyzer/index-analyzer.js';
export {
  analyzeModule,
  extractImports,
  extractPublicApi,
  findEntryPoint,
} from './module/module-main-analyzer/module-main-analyzer.js';

// infra
export {
  cwdHash,
  getCacheDir,
  getLastRunHash,
  hasPromptContext,
  isFirstInSession,
  markSessionInjected,
  pruneOldSessions,
  pruneStaleCacheDirs,
  readBoundary,
  readFractalMap,
  readPromptContext,
  removeSessionFiles,
  removeFractalMap,
  saveRunHash,
  sessionIdHash,
  writeBoundary,
  writeFractalMap,
  writePromptContext,
} from './infra/cache-manager/cache-manager.js';
export type { FractalMap } from './infra/cache-manager/cache-manager.js';
export { computeProjectHash } from './infra/project-hash/project-hash.js';
export { ChangeQueue } from './infra/change-queue/change-queue.js';
export type { ChangeRecord } from './infra/change-queue/change-queue.js';
export {
  createDefaultConfig,
  ensureFcaRules,
  initProject,
  loadConfig,
  loadRuleOverrides,
  resolveLanguage,
  writeConfig,
} from './infra/config-loader/config-loader.js';
export type { FilidConfig, InitResult } from './infra/config-loader/config-loader.js';

// coverage
export { findSubtreeUsages, getModuleName } from './coverage/usage-tracker/usage-tracker.js';
export {
  checkTestCoverage,
  generateCoverageWarnings,
} from './coverage/test-coverage-checker/test-coverage-checker.js';
export { resolveImportPath } from './coverage/import-resolver/import-resolver.js';

// utils
export {
  ALLOWED_FRACTAL_ROOT_FILES,
  FRAMEWORK_PACKAGES,
  FRAMEWORK_RESERVED_FILES,
} from '../constants/allowed-peer-files.js';
export {
  RULE_ERROR_PROBABILITY,
  generateHumanSummary,
  parseFixRequests,
  parseStructureCheckFrontmatter,
} from './utils/pr-summary-generator.js';
export type { GenerateSummaryInput } from './utils/pr-summary-generator.js';

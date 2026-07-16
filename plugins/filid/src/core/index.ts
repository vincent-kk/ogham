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
} from './tree/fractalTree/fractalTree.js';
export type { NodeEntry } from './tree/fractalTree/fractalTree.js';
export {
  classifyNode,
  isInfraOrgDirectoryByPattern,
  KNOWN_ORGAN_DIR_NAMES,
} from './tree/organClassifier/organClassifier.js';
export type { ClassifyInput } from './tree/organClassifier/organClassifier.js';
export {
  buildChain,
  findBoundary,
} from './tree/boundaryDetector/boundaryDetector.js';
export type { ChainResult } from './tree/boundaryDetector/boundaryDetector.js';

// rules
export {
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from './rules/ruleEngine/ruleEngine.js';
export {
  validateDependencies,
  validateNode,
  validateStructure,
} from './rules/fractalValidator/fractalValidator.js';
export {
  countLines,
  detectAppendOnly,
  validateDetailMd,
  validateIntentMd,
} from './rules/documentValidator/documentValidator.js';
export {
  SEVERITY_ORDER,
  calculateSeverity,
  compareCurrent,
  detectDrift,
  generateSyncPlan,
} from './rules/driftDetector/driftDetector.js';

// analysis
export {
  analyzeProject,
  calculateHealthScore,
} from './analysis/projectAnalyzer/projectAnalyzer.js';
export { generateReport } from './analysis/projectAnalyzer/renderers/index.js';
export {
  buildDAG,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
} from './analysis/dependencyGraph/dependencyGraph.js';
export {
  findLCA,
  getAncestorPaths,
  getModulePlacement,
} from './analysis/lcaCalculator/lcaCalculator.js';

// module
export {
  analyzeIndex,
  extractModuleExports,
} from './module/indexAnalyzer/indexAnalyzer.js';
export {
  analyzeModule,
  extractImports,
  extractPublicApi,
  findEntryPoint,
} from './module/moduleMainAnalyzer/moduleMainAnalyzer.js';

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
} from './infra/cacheManager/cacheManager.js';
export type { FractalMap } from './infra/cacheManager/cacheManager.js';
export { computeProjectHash } from './infra/projectHash/projectHash.js';
export { ChangeQueue } from './infra/changeQueue/changeQueue.js';
export type { ChangeRecord } from './infra/changeQueue/changeQueue.js';
export {
  createDefaultConfig,
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleDocsManifest,
  loadRuleOverrides,
  resolveLanguage,
  syncRuleDocs,
  writeConfig,
} from './infra/configLoader/configLoader.js';
export type {
  FilidConfig,
  InitResult,
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
  SyncRuleDocsOptions,
} from './infra/configLoader/configLoader.js';

// coverage
export {
  findSubtreeUsages,
  getModuleName,
} from './coverageVerify/usageTracker/usageTracker.js';
export {
  checkTestCoverage,
  generateCoverageWarnings,
} from './coverageVerify/testCoverageChecker/testCoverageChecker.js';
export { resolveImportPath } from './coverageVerify/importResolver/importResolver.js';

// utils
export {
  ALLOWED_FRACTAL_ROOT_FILES,
  FRAMEWORK_PACKAGES,
  FRAMEWORK_RESERVED_FILES,
} from '../constants/allowedPeerFiles.js';
export {
  RULE_ERROR_PROBABILITY,
  extractRevalidateVerdict,
  extractVerdict,
  generateHumanSummary,
  parseFixRequests,
  parseStructureCheckFrontmatter,
  resolveVerdict,
} from './prSummary/index.js';
export type { GenerateSummaryInput } from './prSummary/index.js';

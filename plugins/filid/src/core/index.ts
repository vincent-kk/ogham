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

// analysis
export {
  buildDAG,
  buildDependencyGraph,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
} from './analysis/dependencyGraph/dependencyGraph.js';
export {
  computeSnapshotHash,
  createProjectSnapshot,
} from './projectSnapshot/index.js';
export { resolveContext } from './contextResolver/index.js';
export {
  findLowestCommonFractal,
  resolveOwningFractal,
} from './analysis/lcaCalculator/index.js';
export {
  createRestructurePlan,
  validatePlanPostconditions,
  validatePlanPreconditions,
} from './restructure/index.js';

// infra
export {
  commitVisit,
  cwdHash,
  getCacheDir,
  getLastRunHash,
  hasPromptContext,
  incrementTurn,
  isFirstInSession,
  markSessionInjected,
  pruneOldSessions,
  pruneStaleCacheDirs,
  readBoundary,
  readDelivered,
  readFractalMap,
  readPromptContext,
  readTurn,
  removeSessionFiles,
  removeFractalMap,
  saveRunHash,
  sessionIdHash,
  writeBoundary,
  writePromptContext,
} from './infra/cacheManager/cacheManager.js';
export type {
  DeliveredState,
  FractalMap,
  VisitArgs,
  VisitDecision,
  VisitScope,
} from './infra/cacheManager/cacheManager.js';
export {
  createDefaultConfig,
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleDocsManifest,
  loadRuleOverrides,
  resolveLanguage,
  resolveMaxDepth,
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

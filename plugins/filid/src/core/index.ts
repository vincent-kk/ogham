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
} from './tree/fractalTree/index.js';
export type { NodeEntry } from './tree/fractalTree/index.js';
export {
  classifyNode,
  isInfraOrgDirectoryByPattern,
  KNOWN_ORGAN_DIR_NAMES,
} from './tree/organClassifier/index.js';
export type { ClassifyInput } from './tree/organClassifier/index.js';
export {
  buildChain,
  findBoundary,
} from './tree/boundaryDetector/index.js';
export type { ChainResult } from './tree/boundaryDetector/index.js';

// rules
export {
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
} from './rules/ruleEngine/index.js';
export {
  validateDependencies,
  validateNode,
  validateStructure,
} from './rules/fractalValidator/index.js';
export {
  countLines,
  detectAppendOnly,
  validateDetailMd,
  validateIntentMd,
} from './rules/documentValidator/index.js';

// analysis
export {
  buildDAG,
  buildDependencyGraph,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
} from './analysis/dependencyGraph/index.js';
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
} from './infra/cacheManager/index.js';
export type {
  DeliveredState,
  FractalMap,
  VisitArgs,
  VisitDecision,
  VisitScope,
} from './infra/cacheManager/index.js';
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
} from './infra/configLoader/index.js';
export type {
  FilidConfig,
  InitResult,
  RuleDocEntry,
  RuleDocStatusEntry,
  RuleDocSyncResult,
  RuleDocsManifest,
  RuleDocsStatus,
  SyncRuleDocsOptions,
} from './infra/configLoader/index.js';

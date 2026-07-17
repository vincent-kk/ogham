/**
 * @ogham/filid
 *
 * FCA-AI (Fractal Context Architecture for AI Agents) rule
 * enforcement plugin for Claude Code agent workflows.
 */

// Type exports
export type * from './types/index.js';

// Core modules (via barrel)
export {
  // tree
  buildFractalTree,
  findNode,
  getAncestors,
  getDescendants,
  getFractalsUnderOrgans,
  scanProject,
  shouldExclude,
  classifyNode,
  isInfraOrgDirectoryByPattern,
  KNOWN_ORGAN_DIR_NAMES,
  buildChain,
  findBoundary,
  // rules
  applyOverrides,
  evaluateRule,
  evaluateRules,
  getActiveRules,
  loadBuiltinRules,
  validateDependencies,
  validateNode,
  validateStructure,
  countLines,
  detectAppendOnly,
  validateDetailMd,
  validateIntentMd,
  SEVERITY_ORDER,
  calculateSeverity,
  compareCurrent,
  detectDrift,
  generateSyncPlan,
  // analysis
  analyzeProject,
  calculateHealthScore,
  generateReport,
  buildDAG,
  detectCycles,
  getDirectDependencies,
  topologicalSort,
  findLCA,
  getAncestorPaths,
  getModulePlacement,
  // module
  analyzeIndex,
  extractModuleExports,
  analyzeModule,
  extractImports,
  extractPublicApi,
  findEntryPoint,
  // infra
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
  computeProjectHash,
  ChangeQueue,
  // config
  createDefaultConfig,
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleDocsManifest,
  loadRuleOverrides,
  resolveLanguage,
  syncRuleDocs,
  writeConfig,
  // coverage
  findSubtreeUsages,
  getModuleName,
  checkTestCoverage,
  generateCoverageWarnings,
  resolveImportPath,
  // utils
  ALLOWED_FRACTAL_ROOT_FILES,
  FRAMEWORK_PACKAGES,
  FRAMEWORK_RESERVED_FILES,
  RULE_ERROR_PROBABILITY,
  extractRevalidateVerdict,
  extractVerdict,
  generateHumanSummary,
  parseFixRequests,
  parseStructureCheckFrontmatter,
  resolveVerdict,
} from './core/index.js';
export type {
  ChainResult,
  ClassifyInput,
  DeliveredState,
  FractalMap,
  GenerateSummaryInput,
  NodeEntry,
  ChangeRecord,
  VisitArgs,
  VisitDecision,
  VisitScope,
} from './core/index.js';

// Metrics
export { countTestCases } from './metrics/testCounter/testCounter.js';
export { checkTestCaseGate } from './metrics/testCaseGate/testCaseGate.js';
export { decide } from './metrics/decisionTree/decisionTree.js';
export { checkPromotionEligibility } from './metrics/promotionTracker/promotionTracker.js';

// Compression
export {
  compactReversible,
  restoreFromCompacted,
} from './compress/reversibleCompactor/reversibleCompactor.js';
export { summarizeLossy } from './compress/lossySummarizer/lossySummarizer.js';

// AST analysis
export { parseSource, parseFile } from './ast/parser/parser.js';
export { extractDependencies } from './ast/dependencyExtractor/dependencyExtractor.js';
export { calculateLCOM4, extractClassInfo } from './ast/lcom4/lcom4.js';
export { calculateCC } from './ast/cyclomaticComplexity/cyclomaticComplexity.js';
export { computeTreeDiff } from './ast/treeDiff/treeDiff.js';

// Hooks
export { handlePreToolUse } from './hooks/preToolUse/preToolUse.js';

export { enforceAgentRole } from './hooks/agentEnforcer/agentEnforcer.js';
export { handleUserPromptSubmit } from './hooks/userPromptSubmit/userPromptSubmit.js';
export { processSetup } from './hooks/setup/setup.js';

// AST Grep tools (pattern matching via @ast-grep/napi)
export { handleAstGrepSearch } from './mcp/tools/astGrepSearch/astGrepSearch.js';
export { handleAstGrepReplace } from './mcp/tools/astGrepReplace/astGrepReplace.js';
export {
  getSgModule,
  getSgLoadError,
  SUPPORTED_LANGUAGES as AST_GREP_LANGUAGES,
  EXT_TO_LANG,
  getFilesForLanguage,
  formatMatch,
  toLangEnum,
} from './ast/astGrepShared/astGrepShared.js';

// MCP tool handlers
export { handleAstAnalyze } from './mcp/tools/astAnalyze/astAnalyze.js';
export { handleConfigPatchValidate } from './mcp/tools/configPatchValidate/configPatchValidate.js';
export { handleFractalNavigate } from './mcp/tools/fractalNavigate/fractalNavigate.js';
export { handleDocCompress } from './mcp/tools/docCompress/docCompress.js';
export { handleTestMetrics } from './mcp/tools/testMetrics/testMetrics.js';
export { handleFractalScan } from './mcp/tools/fractalScan/fractalScan.js';
export { handleDriftDetect } from './mcp/tools/driftDetect/driftDetect.js';
export { handleLcaResolve } from './mcp/tools/lcaResolve/lcaResolve.js';
export { handleRuleQuery } from './mcp/tools/ruleQuery/ruleQuery.js';
export { handleStructureValidate } from './mcp/tools/structureValidate/structureValidate.js';
export { handleReviewManage } from './mcp/tools/reviewManage/reviewManage.js';
export { handleDebtManage } from './mcp/tools/debtManage/debtManage.js';
export { handleCacheManage } from './mcp/tools/cacheManage/cacheManage.js';
export { handleCoverageVerify } from './mcp/tools/coverageVerify/coverageVerify.js';

// Note: format/* and utils/* helpers under review-manage are internal organs
// (Stage 3 / v0.2.0 — see .omc/plans/filid-structural-fix-round1.md T7). They
// are no longer re-exported from the public barrel.

// MCP server
export { createServer, startServer } from './mcp/index.js';

// Constants (runtime values moved from types/ organ)
export { BUILTIN_RULE_IDS } from './constants/builtinRuleIds.js';
export { DEFAULT_SCAN_OPTIONS } from './constants/scanDefaults.js';
export { DEBT_WEIGHT_CAP, DEBT_BASE_WEIGHT } from './constants/debtDefaults.js';
export {
  FIX_REQUEST_TYPES,
  DEBT_ACTIONS,
  PIPELINE_STAGES,
} from './constants/handoffTokens.js';

// Lib utilities
export { normalizeFixRequestType } from './lib/normalizeFixRequest.js';

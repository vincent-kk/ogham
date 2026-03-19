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
  computeProjectHash,
  ChangeQueue,
  // config
  createDefaultConfig,
  ensureFcaRules,
  initProject,
  loadConfig,
  loadRuleOverrides,
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
  generateHumanSummary,
  parseFixRequests,
  parseStructureCheckFrontmatter,
} from './core/index.js';
export type {
  ChainResult,
  ClassifyInput,
  FractalMap,
  GenerateSummaryInput,
  NodeEntry,
  ChangeRecord,
} from './core/index.js';

// Metrics
export { countTestCases } from './metrics/test-counter.js';
export { check312Rule } from './metrics/three-plus-twelve.js';
export { decide } from './metrics/decision-tree.js';
export { checkPromotionEligibility } from './metrics/promotion-tracker.js';

// Compression
export {
  compactReversible,
  restoreFromCompacted,
} from './compress/reversible-compactor.js';
export { summarizeLossy } from './compress/lossy-summarizer.js';

// AST analysis
export { parseSource, parseFile } from './ast/parser.js';
export { extractDependencies } from './ast/dependency-extractor.js';
export { calculateLCOM4, extractClassInfo } from './ast/lcom4.js';
export { calculateCC } from './ast/cyclomatic-complexity.js';
export { computeTreeDiff } from './ast/tree-diff.js';

// Hooks
export { handlePreToolUse, mergeResults } from './hooks/pre-tool-use.js';
export { injectIntent, compressPaths } from './hooks/intent-injector.js';
export { validatePreToolUse } from './hooks/pre-tool-validator.js';
export { guardStructure } from './hooks/structure-guard.js';
/** @deprecated Disabled in hooks.json. Entry stub uses no-op queue. */
export { trackChange } from './hooks/change-tracker.js';
export { enforceAgentRole } from './hooks/agent-enforcer.js';
export { injectContext } from './hooks/context-injector.js';
export { processSetup } from './hooks/setup.js';

// AST Grep tools (pattern matching via @ast-grep/napi)
export { handleAstGrepSearch } from './mcp/tools/ast-grep-search.js';
export { handleAstGrepReplace } from './mcp/tools/ast-grep-replace.js';
export {
  getSgModule,
  getSgLoadError,
  SUPPORTED_LANGUAGES as AST_GREP_LANGUAGES,
  EXT_TO_LANG,
  getFilesForLanguage,
  formatMatch,
  toLangEnum,
} from './ast/ast-grep-shared.js';

// MCP tool handlers
export { handleAstAnalyze } from './mcp/tools/ast-analyze.js';
export { handleFractalNavigate } from './mcp/tools/fractal-navigate.js';
export { handleDocCompress } from './mcp/tools/doc-compress.js';
export { handleTestMetrics } from './mcp/tools/test-metrics.js';
export { handleFractalScan } from './mcp/tools/fractal-scan.js';
export { handleDriftDetect } from './mcp/tools/drift-detect.js';
export { handleLcaResolve } from './mcp/tools/lca-resolve.js';
export { handleRuleQuery } from './mcp/tools/rule-query.js';
export { handleStructureValidate } from './mcp/tools/structure-validate.js';
export { handleReviewManage } from './mcp/tools/review-manage.js';
export {
  formatPrComment,
  formatRevalidateComment,
  formatHumanSummary,
} from './mcp/tools/review-format.js';
export { handleDebtManage } from './mcp/tools/debt-manage.js';
export { handleCacheManage } from './mcp/tools/cache-manage.js';
export { handleCoverageVerify } from './mcp/tools/coverage-verify.js';

// Review shared utilities
export {
  normalizeBranch,
  resolveReviewDir,
  tryReadFile,
} from './mcp/tools/review-utils.js';

// MCP server
export { createServer, startServer } from './mcp/server.js';

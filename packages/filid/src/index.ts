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
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleDocsManifest,
  loadRuleOverrides,
  resolveLanguage,
  resolveRuleDocSelection,
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
export { countTestCases } from './metrics/test-counter/test-counter.js';
export { check312Rule } from './metrics/three-plus-twelve/three-plus-twelve.js';
export { decide } from './metrics/decision-tree/decision-tree.js';
export { checkPromotionEligibility } from './metrics/promotion-tracker/promotion-tracker.js';

// Compression
export {
  compactReversible,
  restoreFromCompacted,
} from './compress/reversible-compactor/reversible-compactor.js';
export { summarizeLossy } from './compress/lossy-summarizer/lossy-summarizer.js';

// AST analysis
export { parseSource, parseFile } from './ast/parser/parser.js';
export { extractDependencies } from './ast/dependency-extractor/dependency-extractor.js';
export { calculateLCOM4, extractClassInfo } from './ast/lcom4/lcom4.js';
export { calculateCC } from './ast/cyclomatic-complexity/cyclomatic-complexity.js';
export { computeTreeDiff } from './ast/tree-diff/tree-diff.js';

// Hooks
export { handlePreToolUse, mergeResults } from './hooks/pre-tool-use/pre-tool-use.js';
export { injectIntent, compressPaths } from './hooks/intent-injector/intent-injector.js';
export { validatePreToolUse } from './hooks/pre-tool-validator/pre-tool-validator.js';
export { guardStructure } from './hooks/structure-guard/structure-guard.js';
/** @deprecated Disabled in hooks.json. Entry stub uses no-op queue. */
export { trackChange } from './hooks/change-tracker/change-tracker.js';
export { enforceAgentRole } from './hooks/agent-enforcer/agent-enforcer.js';
export { injectContext } from './hooks/context-injector/context-injector.js';
export { processSetup } from './hooks/setup/setup.js';

// AST Grep tools (pattern matching via @ast-grep/napi)
export { handleAstGrepSearch } from './mcp/tools/ast-grep-search/ast-grep-search.js';
export { handleAstGrepReplace } from './mcp/tools/ast-grep-replace/ast-grep-replace.js';
export {
  getSgModule,
  getSgLoadError,
  SUPPORTED_LANGUAGES as AST_GREP_LANGUAGES,
  EXT_TO_LANG,
  getFilesForLanguage,
  formatMatch,
  toLangEnum,
} from './ast/ast-grep-shared/ast-grep-shared.js';

// MCP tool handlers
export { handleAstAnalyze } from './mcp/tools/ast-analyze/ast-analyze.js';
export { handleFractalNavigate } from './mcp/tools/fractal-navigate/fractal-navigate.js';
export { handleDocCompress } from './mcp/tools/doc-compress/doc-compress.js';
export { handleTestMetrics } from './mcp/tools/test-metrics/test-metrics.js';
export { handleFractalScan } from './mcp/tools/fractal-scan/fractal-scan.js';
export { handleDriftDetect } from './mcp/tools/drift-detect/drift-detect.js';
export { handleLcaResolve } from './mcp/tools/lca-resolve/lca-resolve.js';
export { handleRuleQuery } from './mcp/tools/rule-query/rule-query.js';
export { handleStructureValidate } from './mcp/tools/structure-validate/structure-validate.js';
export { handleReviewManage } from './mcp/tools/review-manage/review-manage.js';
export { handleDebtManage } from './mcp/tools/debt-manage/debt-manage.js';
export { handleCacheManage } from './mcp/tools/cache-manage/cache-manage.js';
export { handleCoverageVerify } from './mcp/tools/coverage-verify/coverage-verify.js';

// Note: format/* and utils/* helpers under review-manage are internal organs
// (Stage 3 / v0.2.0 — see .omc/plans/filid-structural-fix-round1.md T7). They
// are no longer re-exported from the public barrel.

// MCP server
export { createServer, startServer } from './mcp/server/server.js';

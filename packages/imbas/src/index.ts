/**
 * @file index.ts
 * @description @ogham/imbas public API entry point
 */

export * from './types/index.js';
export { VERSION } from './version.js';

// MCP modules
export { createServer, startServer } from './mcp/server.js';
export { toolResult, toolError, mapReplacer, wrapHandler } from './mcp/shared.js';
export { handleImbasPing } from './mcp/tools/imbas-ping.js';
export { handleRunCreate } from './mcp/tools/run-create.js';
export { handleRunGet } from './mcp/tools/run-get.js';
export { handleRunTransition } from './mcp/tools/run-transition.js';
export { handleRunList } from './mcp/tools/run-list.js';
export { handleManifestGet } from './mcp/tools/manifest-get.js';
export { handleManifestSave } from './mcp/tools/manifest-save.js';
export { handleManifestValidate } from './mcp/tools/manifest-validate.js';
export { handleManifestPlan } from './mcp/tools/manifest-plan.js';
export { handleConfigGet } from './mcp/tools/config-get.js';
export { handleConfigSet } from './mcp/tools/config-set.js';
export { handleCacheGet } from './mcp/tools/cache-get.js';
export { handleCacheSet } from './mcp/tools/cache-set.js';
export { handleAstSearch } from './mcp/tools/ast-search.js';
export { handleAstAnalyze } from './mcp/tools/ast-analyze.js';

// Core modules
export { createRunState, loadRunState, saveRunState, applyTransition } from './core/state-manager.js';
export { loadConfig, saveConfig, getConfigValue, setConfigValue, applyConfigUpdates } from './core/config-manager.js';
export { loadCache, saveCache, isCacheExpired, clearCache } from './core/cache-manager.js';
export { loadManifest, getManifestSummary } from './core/manifest-parser.js';
export { validateManifest } from './core/manifest-validator.js';
export { planExecution } from './core/execution-planner.js';
export { getImbasRoot, getProjectDir, getCacheDir, getRunsDir, getRunDir, getTempDir, getMediaDir } from './core/paths.js';
export { generateRunId } from './core/run-id-generator.js';

// AST modules
export { getSgModule, isSgAvailable, getSgLoadError, collectFiles } from './ast/ast-grep-shared.js';
export { extractDependencies } from './ast/dependency-extractor.js';
export { calculateComplexity } from './ast/cyclomatic-complexity.js';

// Hook modules
export { processSetup } from './hooks/setup.js';

// Lib modules
export { createLogger, setLogDir, resetLogger } from './lib/logger.js';
export type { Logger } from './lib/logger.js';
export { readStdin } from './lib/stdin.js';
export { readJson, writeJson } from './lib/file-io.js';

/**
 * @file index.ts
 * @description @ogham/imbas public API entry point
 */

export * from './types/index.js';
export { VERSION } from './version.js';

// MCP modules
export { createServer, startServer } from './mcp/index.js';
export {
  toolResult,
  toolError,
  mapReplacer,
  wrapHandler,
} from './mcp/index.js';
export {
  handleImbasPing,
  handleRunCreate,
  handleRunGet,
  handleRunTransition,
  handleRunList,
  handleManifestGet,
  handleManifestSave,
  handleManifestValidate,
  handleManifestPlan,
  handleConfigGet,
  handleConfigSet,
  handleCacheGet,
  handleCacheSet,
  handleAstSearch,
  handleAstAnalyze,
} from './mcp/tools/index.js';

// Core modules
export {
  createRunState,
  loadRunState,
  saveRunState,
  applyTransition,
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  applyConfigUpdates,
  loadCache,
  saveCache,
  isCacheExpired,
  clearCache,
  loadManifest,
  getManifestSummary,
  validateManifest,
  planExecution,
  getImbasRoot,
  getProjectDir,
  getCacheDir,
  getRunsDir,
  getRunDir,
  generateRunId,
} from './core/index.js';

// AST modules
export {
  getSgModule,
  isSgAvailable,
  getSgLoadError,
  collectFiles,
  extractDependencies,
  calculateComplexity,
} from './ast/index.js';
export type {
  ImportInfo,
  ExportInfo,
  CallInfo,
  DependencyInfo,
  DependencyError,
} from './ast/index.js';
export type { CyclomaticResult, CyclomaticError } from './ast/index.js';

// Hook modules
export { processSetup } from './hooks/index.js';

// Lib modules
export { createLogger, setLogDir, resetLogger } from './lib/logger.js';
export type { Logger } from './lib/logger.js';
export { readStdin } from './lib/stdin.js';
export { readJson, writeJson } from './lib/file-io.js';

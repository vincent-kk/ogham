/**
 * @file index.ts
 * @description @ogham/imbas public API entry point
 *
 * `mcp/` 는 재노출하지 않는다 — `mcp/server/server.ts` 가 `version.ts` 를
 * 참조하므로 재노출은 src → mcp → mcp/server → src 의존 순환이 된다.
 * MCP 서버는 esbuild 가 `mcp/serverEntry/serverEntry.ts` 에서 조립한다.
 */

export * from './types/index.js';
export { VERSION } from './version.js';

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
export {
  createLogger,
  setLogDir,
  resetLogger,
  readStdin,
  readJson,
  writeJson,
} from './lib/index.js';
export type { Logger } from './lib/index.js';

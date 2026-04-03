/**
 * @file index.ts
 * @description @ogham/imbas public API entry point
 */

export * from './types/index.js';
export { VERSION } from './version.js';

// MCP modules
export { createServer, startServer } from './mcp/server.js';
export { toolResult, toolError, mapReplacer } from './mcp/shared.js';
export { handleImbasPing } from './mcp/tools/imbas-ping.js';

// Hook modules
export { processSetup } from './hooks/setup.js';

// Lib modules
export { createLogger, setLogDir, resetLogger } from './lib/logger.js';
export type { Logger } from './lib/logger.js';
export { readStdin } from './lib/stdin.js';

/**
 * @file index.ts
 * @description @ogham/atlassian public API entry point
 */

export { VERSION } from './version.js';

// Types
export * from './types/index.js';

// Constants
export * from './constants/index.js';

// Core
export * from './core/index.js';

// Converter
export * from './converter/index.js';

// Utils
export * from './utils/index.js';

// MCP
export { createServer, startServer } from './mcp/index.js';
export { toolResult, toolError, mapReplacer, wrapHandler } from './mcp/index.js';

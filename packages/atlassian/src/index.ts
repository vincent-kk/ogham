/**
 * @file index.ts
 * @description @ogham/atlassian public API entry point
 */

export { VERSION } from './version.js';

export { createServer, startServer } from './mcp/index.js';
export { toolResult, toolError, mapReplacer, wrapHandler } from './mcp/index.js';

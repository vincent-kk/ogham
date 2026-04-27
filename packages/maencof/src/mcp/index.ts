/**
 * @file index.ts
 * @description mcp/ public API barrel.
 * server-entry/ 는 top-level startServer() 호출이라는 side-effect를 가진
 * esbuild 진입점이므로 일부러 제외한다. (bridge/mcp-server.cjs로만 사용)
 */
export * from './server/index.js';
export * from './shared/index.js';
export * from './tools/index.js';

/**
 * @file index.ts
 * @description @ogham/atlassian public API entry point
 */

export { VERSION } from "./version.js";

// Types
export * from "./types/index.js";

// Constants
export * from "./constants/index.js";

// Core
export * from "./core/index.js";

// Converter
export * from "./converter/index.js";

// Utils
export * from "./utils/index.js";

// MCP 는 여기서 재노출하지 않는다. 실행 진입점은 esbuild 가 `mcp/serverEntry/` 로부터
// 만드는 `bridge/mcp-server.cjs` 이고, `mcp/server/server.ts` 가 `version.ts` 를 참조하므로
// 재노출하면 src → mcp → server → src 의존 순환이 된다.

export { VERSION } from './version.js';

export * from './types/index.js';
export * from './constants/index.js';
export * from './lib/index.js';
export * from './utils/index.js';
export * from './core/index.js';
export * from './dispatcher/index.js';

// `mcp/` 는 여기서 재노출하지 않는다. 실행 진입점은 esbuild 가 `mcp/serverEntry/` 로부터
// 만드는 `bridge/mcp-server.cjs` 이고, `mcp/server/lifecycle/createServer.ts` 가 `version.ts` 를
// 참조하므로 재노출하면 src → mcp → server → src 의존 순환이 된다.

/**
 * @file index.ts
 * @description mcp/ public API barrel.
 * serverEntry/ 는 top-level startServer() 호출이라는 side-effect를 가진
 * esbuild 진입점이므로 일부러 제외한다. (bridge/mcp-server.cjs로만 사용)
 * server/ 도 같은 이유로 제외한다 — 실행 진입점이며, `server.ts` 가 `version.ts` 를
 * 참조하므로 재노출은 src → mcp → mcp/server → src 의존 순환이 된다.
 * serverEntry 는 `../server/index.js` 를 형제 배럴로 직접 가져간다.
 */
export * from './shared/index.js';
export * from './tools/index.js';

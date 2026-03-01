/**
 * @file server-entry.ts
 * @description esbuild 번들 진입점 — MCP 서버를 stdio 모드로 시작한다.
 *
 * 이 파일은 bridge/mcp-server.cjs 로 번들된다.
 * Claude Code .mcp.json에서 `node bridge/mcp-server.cjs` 로 실행.
 */
import { startServer } from './server.js';

startServer().catch((err: unknown) => {
  process.stderr.write(`maencof MCP server error: ${String(err)}\n`);
  process.exit(1);
});

/**
 * @file serverEntry.ts
 * @description esbuild bundle entry point — starts the entrez MCP server in
 * stdio mode. Bundled into bridge/mcp-server.cjs and invoked by Claude Code via
 * `node bridge/mcp-server.cjs`.
 */
import { startServer } from "../server/index.js";

startServer().catch((err: unknown) => {
  process.stderr.write(`entrez MCP server error: ${String(err)}\n`);
  process.exit(1);
});

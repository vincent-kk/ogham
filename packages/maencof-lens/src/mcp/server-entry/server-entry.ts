/**
 * @file server-entry.ts
 * @description esbuild entry point — starts MCP server on stdio.
 * Bundled to bridge/mcp-server.cjs.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createLensServer } from '../server/server.js';

async function main() {
  const configRoot = process.cwd();
  const server = createLensServer(configRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`maencof-lens MCP server error: ${String(err)}\n`);
  process.exit(1);
});

/**
 * @file serverEntry.ts
 * @description esbuild entry point — starts MCP server on stdio.
 * Bundled to bridge/mcp-server.cjs.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tryProjectRoot } from "@ogham/cross-platform/host-paths";

import { createLensServer } from "../server/server.js";

function resolveConfigRoot(): string | null {
  return process.env["MAENCOF_LENS_CONFIG_ROOT"] ?? tryProjectRoot();
}

async function main() {
  const configRoot = resolveConfigRoot();
  const server = createLensServer(configRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  process.stderr.write(`maencof-lens MCP server error: ${String(err)}\n`);
  process.exit(1);
});

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { bootSweep } from './bootSweep.js';
import { createServer } from './createServer.js';
import { registerShutdown } from './registerShutdown.js';

/** Start the MCP server with stdio transport */
export async function startServer(): Promise<void> {
  const server = createServer();
  registerShutdown();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  setImmediate(bootSweep);
}

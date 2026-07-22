import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from './createServer.js';

/** Connect the server to stdio and serve until the host disconnects. */
export async function startServer(): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

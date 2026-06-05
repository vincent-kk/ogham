import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createServer } from './createServer.js';

export async function startServer(): Promise<void> {
  const server = createServer();

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

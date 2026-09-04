import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../../../mcp/server/lifecycle/createServer.js';

/** Identifies the in-memory client used by MCP surface tests. */
const MCP_TEST_CLIENT_INFO = {
  name: 'filid-tool-surface-test',
  version: '0.0.0',
};

/** Connected MCP client and its paired-resource teardown operation. */
interface ConnectedTestClient {
  /** Client used to inspect the server's advertised tool surface. */
  client: Client;
  /** Closes both ends of the in-memory MCP connection. */
  close: () => Promise<void>;
}

/**
 * Connects a test client to a fresh Filid server over in-memory transports.
 *
 * @returns The connected client and a teardown operation for both peers.
 */
export async function connectTestClient(): Promise<ConnectedTestClient> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client(MCP_TEST_CLIENT_INFO);
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

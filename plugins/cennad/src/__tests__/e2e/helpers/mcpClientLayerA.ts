import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../../../mcp/server/index.js';

export interface LayerAClient {
  client: Client;
  close: () => Promise<void>;
}

export async function makeLayerAClient(): Promise<LayerAClient> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: 'cennad-e2e-layerA', version: '0.0.0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async (): Promise<void> => {
      await client.close();
      await server.close();
    },
  };
}

import { resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface LayerBClientOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface LayerBClient {
  client: Client;
  close: () => Promise<void>;
}

function inheritProcessEnv(): Record<string, string> {
  const inherited: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') inherited[key] = value;
  }
  return inherited;
}

export async function makeLayerBClient(
  opts: LayerBClientOptions = {},
): Promise<LayerBClient> {
  const bridgeDir = process.env.COGAIR_E2E_BRIDGE;
  if (!bridgeDir) {
    throw new Error(
      'COGAIR_E2E_BRIDGE not set — vitest.e2e.globalSetup.ts must export it.',
    );
  }
  const serverPath = resolve(bridgeDir, 'mcp-server.cjs');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: opts.cwd,
    env: { ...inheritProcessEnv(), ...(opts.env ?? {}) },
    stderr: 'inherit',
  });

  const client = new Client({ name: 'cogair-e2e-layerB', version: '0.0.0' });
  await client.connect(transport);

  return {
    client,
    close: async (): Promise<void> => {
      await client.close();
    },
  };
}

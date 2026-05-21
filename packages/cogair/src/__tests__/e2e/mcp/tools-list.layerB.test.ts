import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

describe('MCP tools/list (Layer B)', () => {
  let handle: LayerBClient;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = await makeLayerBClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('exposes start_conversation, continue_conversation, open_settings via spawned bundle', async () => {
    const { tools } = await handle.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'continue_conversation',
      'open_settings',
      'start_conversation',
    ]);
  });

  it('initialize handshake reports server name "tools"', async () => {
    const info = handle.client.getServerVersion();
    expect(info?.name).toBe('tools');
  });
});

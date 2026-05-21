import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import {
  type LayerAClient,
  makeLayerAClient,
} from '../helpers/mcpClientLayerA.js';

describe('MCP tools/list (Layer A)', () => {
  let handle: LayerAClient;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('exposes start_conversation, continue_conversation, open_settings', async () => {
    const { tools } = await handle.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'continue_conversation',
      'open_settings',
      'start_conversation',
    ]);
  });

  it('start_conversation declares provider, prompt, model, options in inputSchema', async () => {
    const { tools } = await handle.client.listTools();
    const start = tools.find((t) => t.name === 'start_conversation');
    expect(start).toBeDefined();
    const props = (start!.inputSchema.properties ?? {}) as Record<
      string,
      object
    >;
    expect(Object.keys(props).sort()).toEqual([
      'model',
      'options',
      'prompt',
      'provider',
    ]);
    expect(start!.inputSchema.required).toEqual(
      expect.arrayContaining(['provider', 'prompt']),
    );
  });
});

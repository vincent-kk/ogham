import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import {
  type LayerAClient,
  makeLayerAClient,
} from '../helpers/mcpClientLayerA.js';

describe('MCP tools/list (Layer A)', () => {
  let handle: LayerAClient;

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('exposes start, continue, open_settings', async () => {
    const { tools } = await handle.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'continue_conversation',
      'open_settings',
      'start_conversation',
    ]);
  });

  it('start_conversation declares provider, prompt, tier, project_root; tier and project_root optional', async () => {
    const { tools } = await handle.client.listTools();
    const start = tools.find((t) => t.name === 'start_conversation');
    expect(start).toBeDefined();
    const props = (start!.inputSchema.properties ?? {}) as Record<
      string,
      object
    >;
    expect(Object.keys(props).sort()).toEqual([
      'project_root',
      'prompt',
      'provider',
      'tier',
    ]);
    expect(start!.inputSchema.required).toEqual(
      expect.arrayContaining(['provider', 'prompt']),
    );
    expect(start!.inputSchema.required).not.toContain('tier');
    expect(start!.inputSchema.required).not.toContain('project_root');
  });
});

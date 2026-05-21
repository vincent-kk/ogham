import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import {
  assertEnvelopeSuccess,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

const enabled = Boolean(process.env.COGAIR_E2E_REAL_CLI);

describe.skipIf(!enabled)('Real CLI smoke', () => {
  let handle: LayerBClient | undefined;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = undefined;
  });

  afterEach(async () => {
    await handle?.close();
  });

  it('gemini low — start_conversation returns success envelope', async () => {
    handle = await makeLayerBClient();
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'gemini',
        prompt: 'reply with the single word OK',
        model: 'low',
      },
    });
    const env = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'gemini',
      turn: 1,
    });
    expect(env.response).not.toBeNull();
  }, 180_000);

  it('codex low — start_conversation returns success envelope', async () => {
    handle = await makeLayerBClient();
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'codex',
        prompt: 'reply with the single word OK',
        model: 'low',
      },
    });
    const env = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'codex',
      turn: 1,
    });
    expect(env.response).not.toBeNull();
  }, 180_000);
});

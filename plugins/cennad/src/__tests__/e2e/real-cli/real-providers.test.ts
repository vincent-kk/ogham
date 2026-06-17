import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { CENNAD_HOME, CONFIG_PATH } from '../../../constants/paths.js';
import {
  assertEnvelopeSuccess,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

const enabled = Boolean(process.env.CENNAD_E2E_REAL_CLI);

async function enableAntigravityConfig(): Promise<void> {
  const config = {
    ...DEFAULT_CONFIG,
    ratio: {
      gemini: { value: 0, enabled: false },
      codex: { value: 50, enabled: true },
      antigravity: { value: 50, enabled: true },
    },
  };
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

describe.skipIf(!enabled)('Real CLI smoke', () => {
  let handle: LayerBClient | undefined;

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
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
        tier: 'low',
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
        tier: 'low',
      },
    });
    const env = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'codex',
      turn: 1,
    });
    expect(env.response).not.toBeNull();
  }, 180_000);

  it('antigravity mid — start_conversation returns success envelope', async () => {
    await enableAntigravityConfig();
    handle = await makeLayerBClient();
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'antigravity',
        prompt: 'reply with the single word OK',
        tier: 'mid',
      },
    });
    const env = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'antigravity',
      turn: 1,
    });
    expect(env.response).not.toBeNull();
  }, 180_000);
});

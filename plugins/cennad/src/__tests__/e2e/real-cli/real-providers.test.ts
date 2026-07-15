import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  assertEnvelopeSuccess,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

const enabled = Boolean(process.env.CENNAD_E2E_REAL_CLI);

// vitest.e2e.setup.ts swaps HOME to a temp dir to isolate CENNAD_HOME/AGY_HOME, which
// would also hide the real CLI auth files (~/.codex, ~/.gemini, ~/.claude) and make
// every provider fail authentication. Restore the real HOME for the child server and
// keep cennad's own data isolated via CENNAD_CONFIG_PATH instead.
const realHome = process.env.CENNAD_E2E_REAL_HOME;
const realUserProfile = process.env.CENNAD_E2E_REAL_USERPROFILE;

describe.skipIf(!enabled)('Real CLI smoke', () => {
  let handle: LayerBClient | undefined;
  let cennadHome: string;

  beforeEach(async () => {
    cennadHome = await mkdtemp(join(tmpdir(), 'cennad-real-'));
    handle = undefined;
  });

  afterEach(async () => {
    await handle?.close();
    await rm(cennadHome, { recursive: true, force: true });
  });

  function realEnv(): Record<string, string> {
    const env: Record<string, string> = { CENNAD_CONFIG_PATH: cennadHome };
    if (realHome !== undefined) env.HOME = realHome;
    if (realUserProfile !== undefined) env.USERPROFILE = realUserProfile;
    return env;
  }

  it('claude low — start_conversation returns success envelope', async () => {
    handle = await makeLayerBClient({ env: realEnv() });
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'claude',
        prompt: 'reply with the single word OK',
        tier: 'low',
      },
    });
    const env = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'claude',
      turn: 1,
    });
    expect(env.response).not.toBeNull();
  }, 180_000);

  it('codex low — start_conversation returns success envelope', async () => {
    handle = await makeLayerBClient({ env: realEnv() });
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
    handle = await makeLayerBClient({ env: realEnv() });
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

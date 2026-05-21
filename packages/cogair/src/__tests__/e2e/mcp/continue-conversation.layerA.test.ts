import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { COGAIR_HOME } from '../../../constants/paths.js';
import { getProjectHash } from '../../../core/projectHash/index.js';
import { readSessionFile } from '../helpers/diskAssert.js';
import {
  assertEnvelopeFailure,
  assertEnvelopeSuccess,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import { geminiEnv } from '../helpers/fakeProviderScripts.js';
import {
  type FakeProvidersHandle,
  installFakeProviders,
} from '../helpers/installFakeProviders.js';
import {
  type LayerAClient,
  makeLayerAClient,
} from '../helpers/mcpClientLayerA.js';

let fake: FakeProvidersHandle;

beforeAll(() => {
  fake = installFakeProviders();
});

afterAll(() => {
  fake.restore();
});

describe('continue_conversation (Layer A)', () => {
  let handle: LayerAClient;

  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('resumes the session, bumps turn_count, updates last_used_at', async () => {
    Object.assign(
      process.env,
      geminiEnv('success', {
        uuid: 'aaaa1111-2222-3333-4444-555566667777',
      }),
    );

    const startResult = await handle.client.callTool({
      name: 'start_conversation',
      arguments: { provider: 'gemini', prompt: 'first' },
    });
    const startEnv = assertEnvelopeSuccess(
      parseToolCallText(startResult.content),
      { provider: 'gemini', turn: 1 },
    );

    const projectHash = getProjectHash(process.cwd());
    const before = await readSessionFile(projectHash, startEnv.session_id);
    if (!before) throw new Error('session not found after start');
    expect(before.turn_count).toBe(1);
    const firstLastUsed = before.last_used_at;

    await new Promise((r) => setTimeout(r, 10));

    const contResult = await handle.client.callTool({
      name: 'continue_conversation',
      arguments: { session_id: startEnv.session_id, prompt: 'second' },
    });
    const contEnv = assertEnvelopeSuccess(
      parseToolCallText(contResult.content),
      { provider: 'gemini', turn: 2 },
    );
    expect(contEnv.session_id).toBe(startEnv.session_id);

    const after = await readSessionFile(projectHash, startEnv.session_id);
    if (!after) throw new Error('session not found after continue');
    expect(after.turn_count).toBe(2);
    expect(after.last_used_at >= firstLastUsed).toBe(true);
  });

  it('returns unknown failure for non-existent session_id', async () => {
    const res = await handle.client.callTool({
      name: 'continue_conversation',
      arguments: {
        session_id: '00000000-0000-4000-8000-000000000000',
        prompt: 'ghost',
      },
    });
    assertEnvelopeFailure(parseToolCallText(res.content), { code: 'unknown' });
  });
});

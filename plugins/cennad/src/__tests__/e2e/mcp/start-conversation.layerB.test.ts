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

import { CENNAD_HOME } from '../../../constants/paths.js';
import { getProjectHash } from '../../../core/projectHash/index.js';
import { readCounter, readSessionFile } from '../helpers/diskAssert.js';
import {
  assertEnvelopeSuccess,
  parseToolCallText,
} from '../helpers/envelopeShape.js';
import { codexEnv, geminiEnv } from '../helpers/fakeProviderScripts.js';
import {
  type FakeProvidersHandle,
  installFakeProviders,
} from '../helpers/installFakeProviders.js';
import {
  type LayerBClient,
  makeLayerBClient,
} from '../helpers/mcpClientLayerB.js';

let fake: FakeProvidersHandle;

beforeAll(() => {
  fake = installFakeProviders();
});

afterAll(() => {
  fake.restore();
});

describe('start_conversation (Layer B)', () => {
  let handle: LayerBClient;

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await handle.close();
  });

  it('gemini success via spawned bundle — envelope, session, counter', async () => {
    handle = await makeLayerBClient({
      env: geminiEnv('success', {
        uuid: 'bbbb2222-cccc-dddd-eeee-ffff00001111',
      }),
    });
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: { provider: 'gemini', prompt: 'hello gemini', model: 'mid' },
    });
    const parsed = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'gemini',
      turn: 1,
    });
    expect(parsed.response).toContain('fake gemini response');

    const projectHash = getProjectHash(process.cwd());
    const session = await readSessionFile(projectHash, parsed.session_id);
    expect(session?.external_session_ref).toBe(
      'bbbb2222-cccc-dddd-eeee-ffff00001111',
    );

    const counter = await readCounter();
    expect(counter?.gemini).toBe(1);
  });

  it('codex success via spawned bundle — JSONL thread_id', async () => {
    handle = await makeLayerBClient({
      env: codexEnv('success', { threadId: 'tid-layerB-codex' }),
    });
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: { provider: 'codex', prompt: 'hello codex', model: 'mid' },
    });
    const parsed = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'codex',
      turn: 1,
    });
    expect(parsed.response).toContain('fake codex response');

    const projectHash = getProjectHash(process.cwd());
    const session = await readSessionFile(projectHash, parsed.session_id);
    expect(session?.external_session_ref).toBe('tid-layerB-codex');
  });

  it('meta.ignored_options stays empty — MCP input strips unknown option keys (e.g., permission flags) at the schema boundary', async () => {
    handle = await makeLayerBClient({ env: geminiEnv('success') });
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'gemini',
        prompt: 'hi',
        model: 'mid',
        options: { multi_agent: true, yolo: true, sandbox: 'read-only' },
      } as Record<string, unknown>,
    });
    const parsed = assertEnvelopeSuccess(parseToolCallText(result.content), {
      provider: 'gemini',
      turn: 1,
    });
    expect(parsed.meta.ignored_options).toEqual([]);
  });
});

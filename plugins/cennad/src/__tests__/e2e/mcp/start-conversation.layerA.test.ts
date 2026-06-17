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

describe('start_conversation (Layer A)', () => {
  let handle: LayerAClient;

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
    handle = await makeLayerAClient();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('gemini success — envelope, disk session, counter increment', async () => {
    Object.assign(
      process.env,
      geminiEnv('success', {
        uuid: 'aaaa1111-bbbb-cccc-dddd-eeeeeeffffff',
      }),
    );
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
    expect(session).not.toBeNull();
    expect(session?.provider).toBe('gemini');
    expect(session?.external_session_ref).toBe(
      'aaaa1111-bbbb-cccc-dddd-eeeeeeffffff',
    );
    expect(session?.turn_count).toBe(1);

    const counter = await readCounter();
    expect(counter?.gemini).toBe(1);
    expect(counter?.codex).toBe(0);
  });

  it('codex success — envelope, JSONL thread_id captured', async () => {
    Object.assign(
      process.env,
      codexEnv('success', { threadId: 'tid-layerA-codex' }),
    );
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
    expect(session?.external_session_ref).toBe('tid-layerA-codex');

    const counter = await readCounter();
    expect(counter?.codex).toBe(1);
  });

  it('meta.ignored_options stays empty — MCP input strips unknown option keys (e.g., permission flags) at the schema boundary', async () => {
    Object.assign(process.env, geminiEnv('success'));
    const result = await handle.client.callTool({
      name: 'start_conversation',
      arguments: {
        provider: 'gemini',
        prompt: 'hi',
        model: 'mid',
        // The MCP inputSchema for start_conversation does not declare `options`.
        // Anything passed here is dropped before the handler runs.
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

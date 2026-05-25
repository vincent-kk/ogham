import { mkdtempSync, rmSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
import { makeLayerBClient } from '../helpers/mcpClientLayerB.js';

let fake: FakeProvidersHandle;

beforeAll(() => {
  fake = installFakeProviders();
});

afterAll(() => {
  fake.restore();
});

describe('continue_conversation (Layer B)', () => {
  beforeEach(async () => {
    await rm(COGAIR_HOME, { recursive: true, force: true });
  });

  it('resumes the session via spawned bundle (same cwd)', async () => {
    const handle = await makeLayerBClient({ env: geminiEnv('success') });
    try {
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
      if (!before) throw new Error('session missing after start');
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
      if (!after) throw new Error('session missing after continue');
      expect(after.turn_count).toBe(2);
      expect(after.last_used_at >= firstLastUsed).toBe(true);
    } finally {
      await handle.close();
    }
  });

  it('cross-project: same session_id from different cwd returns unknown', async () => {
    const otherDir = mkdtempSync(join(tmpdir(), 'cogair-other-cwd-'));
    const first = await makeLayerBClient({ env: geminiEnv('success') });
    const startSessionId = await (async () => {
      const startResult = await first.client.callTool({
        name: 'start_conversation',
        arguments: { provider: 'gemini', prompt: 'first' },
      });
      const startEnv = assertEnvelopeSuccess(
        parseToolCallText(startResult.content),
        { provider: 'gemini', turn: 1 },
      );
      return startEnv.session_id;
    })().finally(() => first.close());

    const second = await makeLayerBClient({
      cwd: otherDir,
      env: geminiEnv('success'),
    });
    try {
      const contResult = await second.client.callTool({
        name: 'continue_conversation',
        arguments: { session_id: startSessionId, prompt: 'second' },
      });
      assertEnvelopeFailure(parseToolCallText(contResult.content), {
        code: 'unknown',
      });
    } finally {
      await second.close();
      rmSync(otherDir, { recursive: true, force: true });
    }
  });
});

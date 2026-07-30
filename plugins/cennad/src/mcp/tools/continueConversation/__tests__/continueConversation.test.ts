import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { CENNAD_HOME } from '../../../../constants/paths.js';
import { saveConfig } from '../../../../core/configManager/index.js';
import { getProjectHash } from '../../../../core/projectHash/index.js';
import {
  createSession,
  getSession,
} from '../../../../core/sessionStore/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../__tests__/fixtures/fakeBinary.js';
import { handleContinueConversation } from '../continueConversation.js';

const FAKE_CODEX = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_CODEX_MODE || 'success';
function emit(o){process.stdout.write(JSON.stringify(o)+'\\n')}
if (mode === 'success') {
  const isResume = args[1] === 'resume';
  const tid = isResume ? args[2] : 'tid-default';
  emit({type:'thread.started', thread_id: tid});
  emit({type:'item.completed', item:{type:'agent_message', text:'resumed response ' + args.join(' ')}});
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('HTTP 401\\n');
  process.exit(1);
}
process.exit(2);
`;

const FAKE_AGY = `#!/usr/bin/env node
process.stdout.write(JSON.stringify({ event: 'result', result: { conversation_id: '11111111-2222-4333-8444-555555555555', status: 'SUCCESS', response: 'agy resumed' } }) + '\\n');
process.exit(0);
`;

let handle: ReturnType<typeof installFakeBinary>;
let agyHandle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;
let restoreAgyPath: () => void;

beforeAll(() => {
  handle = installFakeBinary('codex', FAKE_CODEX);
  agyHandle = installFakeBinary('agy', FAKE_AGY);
  restorePath = prependToPath(handle.dir);
  restoreAgyPath = prependToPath(agyHandle.dir);
});

afterAll(() => {
  restoreAgyPath();
  restorePath();
  agyHandle.cleanup();
  handle.cleanup();
});

beforeEach(async () => {
  await rm(CENNAD_HOME, { recursive: true, force: true });
  delete process.env.CENNAD_FAKE_CODEX_MODE;
});

describe('handleContinueConversation', () => {
  it('returns error.code unknown when the session is not found in current project', async () => {
    const result = await handleContinueConversation({
      session_id: '00000000-0000-4000-8000-000000000000',
      prompt: 'hi',
    });
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('unknown');
  });

  it('returns error.code unknown when the session belongs to a different cwd', async () => {
    const otherCwd = '/some/other/project';
    const session = await createSession({
      provider: 'codex',
      cwd: otherCwd,
      externalSessionRef: 'tid-other',
      model: 'gpt-5-codex',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'hi',
    });
    expect(result.error?.code).toBe('unknown');
  });

  it('resumes the session and increments turn_count on success', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-resume',
      model: 'gpt-5-codex',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
    });

    expect(result.status).toBe('success');
    expect(result.session_id).toBe(session.session_id);
    expect(result.provider).toBe('codex');
    expect(result.meta.turn).toBe(2);

    const hash = getProjectHash(process.cwd());
    const updated = await getSession(hash, session.session_id);
    expect(updated?.turn_count).toBe(2);
    expect(updated?.external_session_ref).toBe('tid-resume');
  });

  // agy names its conversation on every turn. A session that started before it did
  // — or recovered from the transcript — holds the isolated cwd instead, and only a
  // stored promotion makes the next resume target that conversation by name.
  it('stores the conversation id a resume promotes over a legacy cwd ref', async () => {
    const session = await createSession({
      provider: 'antigravity',
      cwd: process.cwd(),
      externalSessionRef: '/legacy/agy/cwd',
      model: 'Gemini 3.1 Pro',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
    });

    expect(result.status).toBe('success');
    const hash = getProjectHash(process.cwd());
    const updated = await getSession(hash, session.session_id);
    expect(updated?.external_session_ref).toBe(
      '11111111-2222-4333-8444-555555555555',
    );
  });

  it('still increments turn_count when the dispatcher fails (attempt tracking)', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'auth-stderr';
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-resume',
      model: 'gpt-5-codex',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
    });
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('auth');

    const hash = getProjectHash(process.cwd());
    const updated = await getSession(hash, session.session_id);
    expect(updated?.turn_count).toBe(2);
  });

  it('rejects resume when the session provider is disabled', async () => {
    await saveConfig('user', {
      ...DEFAULT_CONFIG,
      ratio: {
        ...DEFAULT_CONFIG.ratio,
        codex: { value: 0, enabled: false },
      },
    });
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-disabled',
      model: 'gpt-5-codex',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'hi',
    });

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('disabled');
    expect(result.provider).toBe('codex');

    const hash = getProjectHash(process.cwd());
    const updated = await getSession(hash, session.session_id);
    expect(updated?.turn_count).toBe(1);
  });

  // Tiers now select a model, so falling back to default_tier on resume would switch
  // models mid-thread. The session's own tier wins unless the caller names one.
  it("restores the session's tier when the caller omits one", async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-resume',
      model: 'gpt-5.6-sol',
      tier: 'high',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
    });

    expect(result.status).toBe('success');
    expect(result.response).toContain('-m gpt-5.6-sol');
    expect(result.response).toContain('model_reasoning_effort=max');
  });

  it('falls back to default_tier for a legacy session with no recorded tier', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-resume',
      model: 'gpt-5-codex',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
    });

    expect(result.status).toBe('success');
    expect(result.response).toContain('-m gpt-5.6-terra');
  });

  it('lets an explicit tier override the recorded session tier', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const session = await createSession({
      provider: 'codex',
      cwd: process.cwd(),
      externalSessionRef: 'tid-resume',
      model: 'gpt-5.6-luna',
      tier: 'low',
    });

    const result = await handleContinueConversation({
      session_id: session.session_id,
      prompt: 'follow up',
      tier: 'high',
    });

    expect(result.status).toBe('success');
    expect(result.response).toContain('-m gpt-5.6-sol');
  });
});

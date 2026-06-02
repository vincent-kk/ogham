import { rm } from 'node:fs/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { COGAIR_HOME } from '../../../../constants/paths.js';
import { saveConfig } from '../../../../core/configManager/index.js';
import { getProjectHash } from '../../../../core/projectHash/index.js';
import {
  createSession,
  getSession,
} from '../../../../core/sessionStore/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { handleContinueConversation } from '../continueConversation.js';

const FAKE_CODEX = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.COGAIR_FAKE_CODEX_MODE || 'success';
function emit(o){process.stdout.write(JSON.stringify(o)+'\\n')}
if (mode === 'success') {
  const isResume = args[1] === 'resume';
  const tid = isResume ? args[2] : 'tid-default';
  emit({type:'thread.started', thread_id: tid});
  emit({type:'item.completed', item:{type:'agent_message', text:'resumed response'}});
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('HTTP 401\\n');
  process.exit(1);
}
process.exit(2);
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('codex', FAKE_CODEX);
  restorePath = prependToPath(handle.dir);
});

afterAll(() => {
  restorePath();
  handle.cleanup();
});

beforeEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
  delete process.env.COGAIR_FAKE_CODEX_MODE;
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
    process.env.COGAIR_FAKE_CODEX_MODE = 'success';
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

  it('still increments turn_count when the dispatcher fails (attempt tracking)', async () => {
    process.env.COGAIR_FAKE_CODEX_MODE = 'auth-stderr';
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
    await saveConfig({
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
});

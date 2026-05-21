import { readFile, rm } from 'node:fs/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { COGAIR_HOME, sessionPath } from '../../../../constants/paths.js';
import { getProjectHash } from '../../../../core/projectHash/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { handleStartConversation } from '../handler.js';

const FAKE_CODEX = `#!/usr/bin/env node
const mode = process.env.COGAIR_FAKE_CODEX_MODE || 'success';
function emit(o){process.stdout.write(JSON.stringify(o)+'\\n')}
if (mode === 'success') {
  emit({type:'thread.started', thread_id:'tid-mcp-success'});
  emit({type:'item.completed', item:{type:'agent_message', text:'codex via mcp'}});
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('HTTP 401 Unauthorized\\n');
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

describe('handleStartConversation', () => {
  it('returns a success envelope and persists the session', async () => {
    process.env.COGAIR_FAKE_CODEX_MODE = 'success';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
    });

    expect(result.status).toBe('success');
    expect(result.provider).toBe('codex');
    expect(result.session_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(result.response).toContain('codex via mcp');
    expect(result.meta.turn).toBe(1);
    expect(result.error).toBeNull();

    const hash = getProjectHash(process.cwd());
    const stored = JSON.parse(
      await readFile(sessionPath(hash, result.session_id), 'utf8'),
    );
    expect(stored.external_session_ref).toBe('tid-mcp-success');
    expect(stored.provider).toBe('codex');
    expect(stored.turn_count).toBe(1);
  });

  it('still persists the session when the external CLI fails', async () => {
    process.env.COGAIR_FAKE_CODEX_MODE = 'auth-stderr';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
    });

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('auth');
    expect(result.session_id).toBeTruthy();

    const hash = getProjectHash(process.cwd());
    const stored = JSON.parse(
      await readFile(sessionPath(hash, result.session_id), 'utf8'),
    );
    expect(stored.session_id).toBe(result.session_id);
  });

  it('reports unsupported options in meta.ignored_options', async () => {
    process.env.COGAIR_FAKE_CODEX_MODE = 'success';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
      options: { multi_agent: true },
    });
    expect(result.meta.ignored_options).toContain('multi_agent');
  });
});

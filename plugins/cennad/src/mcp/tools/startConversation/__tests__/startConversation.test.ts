import { readFile, rm } from 'node:fs/promises';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { CENNAD_HOME, sessionPath } from '../../../../constants/paths.js';
import { saveConfig } from '../../../../core/configManager/index.js';
import { getProjectHash } from '../../../../core/projectHash/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { handleStartConversation } from '../startConversation.js';

const FAKE_CODEX = `#!/usr/bin/env node
const mode = process.env.CENNAD_FAKE_CODEX_MODE || 'success';
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
  await rm(CENNAD_HOME, { recursive: true, force: true });
  delete process.env.CENNAD_FAKE_CODEX_MODE;
});

describe('handleStartConversation', () => {
  it('returns a success envelope and persists the session', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
      tier: 'mid',
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
    process.env.CENNAD_FAKE_CODEX_MODE = 'auth-stderr';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
      tier: 'mid',
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

  it('does not accept yolo/sandbox keys on MCP input (StartConversationInput excludes options)', () => {
    type Input = Parameters<typeof handleStartConversation>[0];
    // Compile-time assertion: Input must not expose permission keys
    const inputKeys: Array<keyof Input> = ['provider', 'prompt', 'tier'];
    expect(inputKeys).not.toContain('options' as keyof Input);
    expect(inputKeys).not.toContain('yolo' as keyof Input);
    expect(inputKeys).not.toContain('sandbox' as keyof Input);
  });

  it('emits no ignored_options because MCP input cannot pass extra option keys', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
      tier: 'mid',
    });
    expect(result.meta.ignored_options).toEqual([]);
  });

  it('applies the provider default tier when tier is omitted', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
    });

    expect(result.status).toBe('success');
    expect(result.session_id).toBeTruthy();
  });

  it('rejects a disabled provider without dispatching or persisting a session', async () => {
    await saveConfig({
      ...DEFAULT_CONFIG,
      ratio: {
        ...DEFAULT_CONFIG.ratio,
        codex: { value: 0, enabled: false },
      },
    });

    const result = await handleStartConversation({
      provider: 'codex',
      prompt: 'hi',
      tier: 'mid',
    });

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('disabled');
    expect(result.provider).toBe('codex');
    expect(result.response).toBeNull();
    expect(result.meta.turn).toBe(0);

    const hash = getProjectHash(process.cwd());
    await expect(
      readFile(sessionPath(hash, result.session_id), 'utf8'),
    ).rejects.toThrow();
  });
});

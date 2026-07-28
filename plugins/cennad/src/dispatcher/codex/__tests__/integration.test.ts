import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import type {
  CodexFlags,
  CodexModelMap,
  DispatchOptions,
} from '../../../types/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../__tests__/fakeBinary.js';
import { codexDispatcher } from '../index.js';

const FLAGS_READ_ONLY: CodexFlags = { yolo: false, sandbox: 'read-only' };

const MODEL_MAP: CodexModelMap = {
  apex: { model: 'gpt-5.6-sol', effort: 'ultra' },
  high: { model: 'gpt-5.6-sol', effort: 'max' },
  mid: { model: 'gpt-5.6-terra', effort: 'medium' },
  low: { model: 'gpt-5.6-luna', effort: 'medium' },
};

const FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_CODEX_MODE || 'success';

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\\n'); }

if (mode === 'success') {
  const isResume = args[1] === 'resume';
  const threadId = isResume ? args[2] : (process.env.CENNAD_FAKE_CODEX_THREAD || 'thread-uuid-fake');
  emit({ type: 'thread.started', thread_id: threadId });
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'fake codex response' } });
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('Error: HTTP 401 Unauthorized\\n');
  process.exit(1);
} else if (mode === 'rate-limit-stderr') {
  process.stderr.write('Error: HTTP 429 Too Many Requests\\n');
  process.exit(1);
} else if (mode === 'network-stderr') {
  process.stderr.write('Error: ECONNRESET\\n');
  process.exit(1);
} else if (mode === 'exit-127') {
  process.exit(127);
} else if (mode === 'exit-53') {
  process.exit(53);
} else if (mode === 'turn-failed-exit-zero') {
  emit({ type: 'thread.started', thread_id: 'thread-uuid-fake' });
  emit({ type: 'error', message: "You've hit your usage limit." });
  emit({ type: 'turn.failed', error: { message: "You've hit your usage limit." } });
  process.exit(0);
} else if (mode === 'notice-then-answer') {
  emit({ type: 'thread.started', thread_id: 'thread-uuid-fake' });
  emit({ type: 'error', message: 'a tool call failed, retrying' });
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'fake codex response' } });
  process.exit(0);
} else if (mode === 'no-thread-id') {
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'no thread' } });
  process.exit(0);
} else if (mode === 'success-with-model') {
  emit({ type: 'thread.started', thread_id: 'thread-uuid-fake' });
  emit({ type: 'turn.started', model: 'gpt-5.6-streamed' });
  emit({ type: 'item.completed', item: { type: 'agent_message', text: 'fake codex response' } });
  process.exit(0);
} else {
  process.exit(2);
}
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('codex', FAKE_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(() => {
  restorePath();
  handle.cleanup();
});

beforeEach(() => {
  delete process.env.CENNAD_FAKE_CODEX_MODE;
  delete process.env.CENNAD_FAKE_CODEX_THREAD;
});

function baseOptions(): DispatchOptions<CodexFlags, CodexModelMap> {
  return {
    prompt: 'hello',
    tier: 'mid',
    options: {},
    sessionId: 'cennad-session',
    cwd: process.cwd(),
    flags: FLAGS_READ_ONLY,
    idleTimeoutMs: 5000,
    hardCapMs: 10000,
  };
}

describe('codexDispatcher.start', () => {
  it('returns success and captures thread_id from the JSONL stream', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    process.env.CENNAD_FAKE_CODEX_THREAD = 'tid-success';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.error).toBeNull();
    expect(result.response).toContain('fake codex response');
    expect(result.externalSessionRef).toBe('tid-success');
  });

  // codex can report a failed turn and still exit 0. Reading only the exit code
  // hands the caller a success with no answer and drops the reason it did give.
  it('fails with the streamed reason when a turn fails and codex exits 0', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'turn-failed-exit-zero';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('rate_limit');
    expect(result.error?.message).toContain('usage limit');
  });

  // An `error` event beside a delivered answer is a notice, not a verdict.
  it('keeps a success when an error event accompanies an answer', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'notice-then-answer';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.response).toContain('fake codex response');
  });

  it('maps HTTP 401 stderr to an auth failure', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'auth-stderr';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('auth');
  });

  it('maps HTTP 429 stderr to a rate_limit failure', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'rate-limit-stderr';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('rate_limit');
  });

  it('maps ECONNRESET stderr to a network failure', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'network-stderr';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('network');
  });

  it('maps exit 127 to cli_error', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'exit-127';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('cli_error');
  });

  it('returns unknown failure when codex exits 0 without emitting thread.started', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'no-thread-id';
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('unknown');
  });

  // codex names no model in its JSONL stream, so without this fallback every
  // codex session is recorded under a tier label instead of a model.
  it('reports the tier-resolved model when the stream names none', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await codexDispatcher.start({
      ...baseOptions(),
      modelMap: MODEL_MAP,
    });
    expect(result.resolvedModel).toBe('gpt-5.6-terra');
  });

  it('prefers the model the stream names over the tier-resolved one', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success-with-model';
    const result = await codexDispatcher.start({
      ...baseOptions(),
      modelMap: MODEL_MAP,
    });
    expect(result.resolvedModel).toBe('gpt-5.6-streamed');
  });

  it('records unsupported options in ignoredOptions', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await codexDispatcher.start({
      ...baseOptions(),
      options: { multi_agent: true, search: true } as Record<string, unknown>,
    });
    expect(result.ignoredOptions.sort()).toEqual(['multi_agent', 'search']);
  });
});

describe('codexDispatcher.resume', () => {
  it('passes the existing externalSessionRef through and preserves it on success', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'success';
    const result = await codexDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: 'existing-thread-uuid',
    });
    expect(result.status).toBe('success');
    expect(result.externalSessionRef).toBe('existing-thread-uuid');
  });

  it('reports budget_exhausted on exit 53', async () => {
    process.env.CENNAD_FAKE_CODEX_MODE = 'exit-53';
    const result = await codexDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: 'existing-thread-uuid',
    });
    expect(result.error?.code).toBe('budget_exhausted');
    expect(result.externalSessionRef).toBe('existing-thread-uuid');
  });
});

describe('codexDispatcher cli-missing', () => {
  let savedPath: string | undefined;

  beforeEach(() => {
    savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
  });

  afterEach(() => {
    process.env.PATH = savedPath;
  });

  it('returns cli_error when codex is not on PATH', async () => {
    const result = await codexDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });
});

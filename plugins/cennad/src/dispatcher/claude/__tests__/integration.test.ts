import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  installFakeBinary,
  prependToPath,
} from '../../../__tests__/fixtures/fakeBinary.js';
import type {
  ClaudeFlags,
  ClaudeModelMap,
  DispatchOptions,
} from '../../../types/index.js';
import { claudeDispatcher } from '../index.js';

const FLAGS: ClaudeFlags = { permission_mode: 'dontAsk' };

const MODEL_MAP: ClaudeModelMap = {
  apex: { model: 'opus', effort: 'ultracode' },
  high: { model: 'opus', effort: 'max' },
  mid: { model: 'sonnet', effort: 'medium' },
  low: { model: 'haiku' },
};

// Minimal stand-in for `claude -p --output-format stream-json`: enough of the
// event shape for the parser, plus a mode that never finishes so a cancellation
// has something to interrupt.
const FAKE_SCRIPT = `#!/usr/bin/env node
const mode = process.env.CENNAD_FAKE_CLAUDE_MODE || 'success';

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\\n'); }

if (mode === 'success') {
  emit({ type: 'result', subtype: 'success', is_error: false, result: 'fake claude response' });
  process.exit(0);
} else if (mode === 'hang') {
  emit({ type: 'system', subtype: 'init' });
  setInterval(() => {}, 1000);
} else {
  process.exit(2);
}
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('claude', FAKE_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(() => {
  restorePath();
  handle.cleanup();
});

beforeEach(() => {
  delete process.env.CENNAD_FAKE_CLAUDE_MODE;
});

function baseOptions(): DispatchOptions<ClaudeFlags, ClaudeModelMap> {
  return {
    prompt: 'hello',
    tier: 'mid',
    options: {},
    sessionId: 'claude-session',
    cwd: process.cwd(),
    flags: FLAGS,
    modelMap: MODEL_MAP,
    idleTimeoutMs: 5000,
    hardCapMs: 10_000,
  };
}

describe('claudeDispatcher.start', () => {
  it('parses the streamed result event into a success', async () => {
    process.env.CENNAD_FAKE_CLAUDE_MODE = 'success';
    const result = await claudeDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.response).toContain('fake claude response');
  });

  // Without the signal reaching the spawn this run would sit there until the
  // hard cap fired and come back as `timeout`.
  it('returns cancelled when the caller aborts a running CLI', async () => {
    process.env.CENNAD_FAKE_CLAUDE_MODE = 'hang';
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 200);

    const result = await claudeDispatcher.start({
      ...baseOptions(),
      idleTimeoutMs: 3000,
      hardCapMs: 3000,
      signal: caller.signal,
    });

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cancelled');
    expect(result.response).toBeNull();
  });
});

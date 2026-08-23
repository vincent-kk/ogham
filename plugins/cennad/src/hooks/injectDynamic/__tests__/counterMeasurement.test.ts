// filid:contract AC-counter-measurement-matrix
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CENNAD_HOME, COUNTER_PATH } from '../../shared/paths.js';
import { loadCounter } from '../utils/loadCounter.js';

const originalExplicitIdentity = process.env.CENNAD_HOST_SESSION_ID;
const originalClaudePid = process.env.CLAUDE_PID;

function writeCounter(value: unknown): void {
  mkdirSync(dirname(COUNTER_PATH), { recursive: true });
  writeFileSync(COUNTER_PATH, JSON.stringify(value));
}

describe('loadCounter measurement state', () => {
  beforeEach(() => {
    rmSync(CENNAD_HOME, { recursive: true, force: true });
    process.env.CENNAD_HOST_SESSION_ID = 'session-a';
    delete process.env.CLAUDE_PID;
  });

  afterEach(() => {
    rmSync(CENNAD_HOME, { recursive: true, force: true });
    if (originalExplicitIdentity === undefined)
      delete process.env.CENNAD_HOST_SESSION_ID;
    else process.env.CENNAD_HOST_SESSION_ID = originalExplicitIdentity;
    if (originalClaudePid === undefined) delete process.env.CLAUDE_PID;
    else process.env.CLAUDE_PID = originalClaudePid;
  });

  it('reports unidentified before considering persisted counts', () => {
    delete process.env.CENNAD_HOST_SESSION_ID;
    writeCounter({
      host_session_id: 'session-a',
      codex: 4,
      antigravity: 2,
      claude: 1,
    });
    expect(loadCounter()).toEqual({
      status: 'unidentified',
      codex: 0,
      antigravity: 0,
      claude: 0,
    });
  });

  it('reports a missing file separately from a measured zero', () => {
    expect(loadCounter()).toEqual({
      status: 'missing',
      codex: 0,
      antigravity: 0,
      claude: 0,
    });
    writeCounter({
      host_session_id: 'session-a',
      codex: 0,
      antigravity: 0,
      claude: 0,
    });
    expect(loadCounter()).toEqual({
      status: 'measured',
      codex: 0,
      antigravity: 0,
      claude: 0,
    });
  });

  it('reports stale and invalid records without exposing their counts', () => {
    writeCounter({
      host_session_id: 'session-b',
      codex: 4,
      antigravity: 2,
      claude: 1,
    });
    expect(loadCounter().status).toBe('stale');
    writeFileSync(COUNTER_PATH, '{ broken');
    expect(loadCounter().status).toBe('invalid');
  });

  it('keeps matching legacy CLAUDE_PID counters measurable', () => {
    delete process.env.CENNAD_HOST_SESSION_ID;
    process.env.CLAUDE_PID = '4242';
    writeCounter({ parent_pid: 4242, codex: 4, antigravity: 2, claude: 1 });
    expect(loadCounter()).toEqual({
      status: 'measured',
      codex: 4,
      antigravity: 2,
      claude: 1,
    });
  });
});

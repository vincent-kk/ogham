import { describe, expect, it } from 'vitest';

import { mapError } from '../errorMap/index.js';

// codex reports why a turn failed through its JSONL stream, not stderr — a
// usage-limit run exits 1 with stderr carrying only "Reading additional input
// from stdin...". Classifying on stderr alone calls that `unknown` and relays the
// stdin notice as the reason, so the structured message has to win.
const CODEX_USAGE_LIMIT =
  "You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), " +
  'visit https://chatgpt.com/codex/settings/usage to purchase more credits or try ' +
  'again at Aug 3rd, 2026 3:00 AM.';

describe('mapError with a structured CLI message', () => {
  it('classifies a codex usage limit as rate_limit despite silent stderr', () => {
    const error = mapError({
      exitCode: 1,
      stderr: 'Reading additional input from stdin...\n',
      cliMessage: CODEX_USAGE_LIMIT,
    });
    expect(error.code).toBe('rate_limit');
  });

  it('relays the structured message instead of incidental stderr', () => {
    const error = mapError({
      exitCode: 1,
      stderr: 'Reading additional input from stdin...\n',
      cliMessage: CODEX_USAGE_LIMIT,
    });
    expect(error.message).toContain('usage limit');
    expect(error.message).not.toContain('additional input from stdin');
  });

  it('still classifies from stderr when no structured message is present', () => {
    const error = mapError({
      exitCode: 1,
      stderr: 'HTTP 429 Too Many Requests',
    });
    expect(error.code).toBe('rate_limit');
    expect(error.message).toContain('429');
  });

  it('lets a stderr signal classify when the structured message is unremarkable', () => {
    const error = mapError({
      exitCode: 1,
      stderr: 'HTTP 401 Unauthorized',
      cliMessage: 'the turn did not complete',
    });
    expect(error.code).toBe('auth');
  });

  // A timeout reports through spawnError alone: stderr is empty and there is no
  // structured message, so dropping it leaves the caller with a bare code
  // instead of which limit fired and how long it was.
  it('relays a spawn error message when nothing else reported', () => {
    const timedOut = Object.assign(
      new Error('agy produced no output for 600000ms — treated as stalled'),
      { code: 'ETIMEDOUT' },
    );
    const error = mapError({
      exitCode: -1,
      stderr: '',
      spawnError: timedOut as NodeJS.ErrnoException,
    });
    expect(error.code).toBe('timeout');
    expect(error.message).toContain('produced no output for 600000ms');
  });

  // A stalled codex always leaves the stdin notice on stderr, so ranking stderr
  // above spawnError would hide which limit fired behind that notice on every
  // timeout — the one case where the caller most needs to know.
  it('prefers the spawn error over incidental stderr', () => {
    const timedOut = Object.assign(
      new Error(
        "codex reached this tier's 3600000ms ceiling while still running",
      ),
      { code: 'ETIMEDOUT' },
    );
    const error = mapError({
      exitCode: -1,
      stderr: 'Reading additional input from stdin...\n',
      spawnError: timedOut as NodeJS.ErrnoException,
    });
    expect(error.message).toContain("tier's 3600000ms ceiling");
    expect(error.message).not.toContain('additional input from stdin');
  });

  it('ignores an empty structured message', () => {
    const error = mapError({
      exitCode: 1,
      stderr: 'ECONNRESET while streaming',
      cliMessage: '   ',
    });
    expect(error.code).toBe('network');
    expect(error.message).toContain('ECONNRESET');
  });
});

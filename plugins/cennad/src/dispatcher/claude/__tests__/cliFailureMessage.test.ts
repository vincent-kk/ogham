import { describe, expect, it } from 'vitest';

import { cliFailureMessage } from '../utils/cliFailureMessage.js';

const resultEvent = (fields: Record<string, unknown>) =>
  JSON.stringify({ type: 'result', ...fields });

describe('cliFailureMessage', () => {
  // A usage-limit run exits non-zero with an empty stderr and the reason in the
  // stream, so without this the envelope degrades to unknown / "Unclassified
  // failure." — the same gap codex and agy already close with cliMessage.
  it('returns the reason a failed result event carries', () => {
    const stdout = [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      resultEvent({
        subtype: 'error_during_execution',
        is_error: true,
        result: 'Claude AI usage limit reached. Resets at 3:00 AM.',
      }),
    ].join('\n');
    expect(cliFailureMessage(stdout)).toContain('usage limit reached');
  });

  it('names the subtype when the failed event carries no text', () => {
    expect(
      cliFailureMessage(resultEvent({ subtype: 'error_max_turns' })),
    ).toContain('error_max_turns');
  });

  // Nothing to relay: the caller then falls back to stderr and spawnError, which is
  // where a spawn-level failure actually reports.
  it('returns null when the stream carried no result event', () => {
    expect(cliFailureMessage('')).toBeNull();
    expect(cliFailureMessage('claude: command not found')).toBeNull();
    expect(
      cliFailureMessage(JSON.stringify({ type: 'system', subtype: 'init' })),
    ).toBeNull();
  });

  it('returns null for a successful result event', () => {
    expect(
      cliFailureMessage(
        resultEvent({ subtype: 'success', is_error: false, result: 'answer' }),
      ),
    ).toBeNull();
  });
});

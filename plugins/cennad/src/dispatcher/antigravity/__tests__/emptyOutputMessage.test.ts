import { describe, expect, it } from 'vitest';

import { emptyOutputMessage } from '../utils/emptyOutputMessage.js';

const FALLBACK =
  'agy returned no output and the response could not be recovered. Try again, or update the agy CLI.';

describe('emptyOutputMessage', () => {
  it('surfaces agy stderr verbatim when present', () => {
    const stderr =
      'a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied. re-run with --dangerously-skip-permissions.';
    const msg = emptyOutputMessage(stderr);
    expect(msg).toContain('agy reported:');
    expect(msg).toContain(stderr);
  });

  it('trims surrounding whitespace before embedding stderr', () => {
    expect(emptyOutputMessage('  boom  ')).toBe(
      'agy produced no recoverable output. agy reported: boom',
    );
  });

  it('falls back to the version-agnostic hint when stderr is blank', () => {
    expect(emptyOutputMessage('   \n  ')).toBe(FALLBACK);
    expect(emptyOutputMessage('')).toBe(FALLBACK);
  });
});

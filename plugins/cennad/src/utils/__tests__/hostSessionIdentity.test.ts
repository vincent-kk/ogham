import { describe, expect, it } from 'vitest';

import { resolveHostSessionIdentity } from '../hostSessionIdentity.js';

describe('resolveHostSessionIdentity', () => {
  it('prefers the explicit cennad host session identifier', () => {
    expect(
      resolveHostSessionIdentity({
        CENNAD_HOST_SESSION_ID: ' codex-session ',
        CLAUDE_PID: '4242',
      }),
    ).toBe('codex-session');
  });

  it('normalizes a positive CLAUDE_PID for Claude compatibility', () => {
    expect(resolveHostSessionIdentity({ CLAUDE_PID: '4242' })).toBe(
      'claude-pid:4242',
    );
  });

  it('does not infer an identity when neither shared channel is valid', () => {
    expect(resolveHostSessionIdentity({})).toBeNull();
    expect(resolveHostSessionIdentity({ CLAUDE_PID: '-1' })).toBeNull();
    expect(
      resolveHostSessionIdentity({ CENNAD_HOST_SESSION_ID: '   ' }),
    ).toBeNull();
  });
});

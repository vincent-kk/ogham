import { describe, expect, it } from 'vitest';

import { resolveSandboxEnv } from '../utils/resolveSandboxEnv.js';

describe('resolveSandboxEnv', () => {
  it('contributes nothing when sandbox state is unspecified (metadata calls)', () => {
    expect(resolveSandboxEnv({})).toEqual({});
    expect(resolveSandboxEnv({ sandboxBackend: 'docker' })).toEqual({});
  });

  it('forces GEMINI_SANDBOX=false when sandbox is disabled, defeating inherited env', () => {
    expect(resolveSandboxEnv({ sandbox: false })).toEqual({
      GEMINI_SANDBOX: 'false',
    });
    expect(
      resolveSandboxEnv({ sandbox: false, sandboxBackend: 'docker' }),
    ).toEqual({ GEMINI_SANDBOX: 'false' });
  });

  it('pins the chosen backend when sandbox is enabled with a non-auto backend', () => {
    expect(
      resolveSandboxEnv({ sandbox: true, sandboxBackend: 'docker' }),
    ).toEqual({ GEMINI_SANDBOX: 'docker' });
    expect(
      resolveSandboxEnv({ sandbox: true, sandboxBackend: 'podman' }),
    ).toEqual({ GEMINI_SANDBOX: 'podman' });
    expect(
      resolveSandboxEnv({ sandbox: true, sandboxBackend: 'sandbox-exec' }),
    ).toEqual({ GEMINI_SANDBOX: 'sandbox-exec' });
  });

  it('defers to the --sandbox flag when sandbox is enabled with auto backend', () => {
    expect(
      resolveSandboxEnv({ sandbox: true, sandboxBackend: 'auto' }),
    ).toEqual({});
    expect(resolveSandboxEnv({ sandbox: true })).toEqual({});
  });
});

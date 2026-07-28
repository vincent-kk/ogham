import { describe, expect, it } from 'vitest';

import type {
  AntigravityFlags,
  DispatchOptions,
  DispatchResumeOptions,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';

const OFF: AntigravityFlags = { sandbox: false, skip_permissions: false };

function startArgs(
  flags: AntigravityFlags,
  model: string | null = null,
): string[] {
  const opts: DispatchOptions<AntigravityFlags> = {
    prompt: 'hi',
    tier: 'mid',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    idleTimeoutMs: 5000,
    hardCapMs: 10000,
  };
  return buildStartArgs(opts, model);
}

function resumeArgs(
  flags: AntigravityFlags,
  model: string | null = null,
  externalSessionRef = '/tmp/cwd',
): string[] {
  const opts: DispatchResumeOptions<AntigravityFlags> = {
    prompt: 'hi',
    tier: 'mid',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    externalSessionRef,
    idleTimeoutMs: 5000,
    hardCapMs: 10000,
  };
  return buildResumeArgs(opts, model);
}

describe('antigravity buildStartArgs', () => {
  it('starts with -p <prompt> and streams its output', () => {
    expect(startArgs(OFF).slice(0, 4)).toEqual([
      '-p',
      'hi',
      '--output-format',
      'stream-json',
    ]);
  });

  it('sends the tier ceiling as --print-timeout so agy drops its own 5m default', () => {
    const args = startArgs(OFF);
    expect(args[args.indexOf('--print-timeout') + 1]).toBe('10s');
  });

  it('omits permission flags when both are off', () => {
    const args = startArgs(OFF);
    expect(args).not.toContain('--sandbox');
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('emits --sandbox when flags.sandbox=true', () => {
    expect(startArgs({ sandbox: true, skip_permissions: false })).toContain(
      '--sandbox',
    );
  });

  it('emits --dangerously-skip-permissions when flags.skip_permissions=true', () => {
    expect(startArgs({ sandbox: false, skip_permissions: true })).toContain(
      '--dangerously-skip-permissions',
    );
  });

  it('appends --model=<name> when a model name is given', () => {
    const args = startArgs(OFF, 'Gemini 3.1 Pro');
    expect(args).toContain('--model=Gemini 3.1 Pro');
    expect(args).not.toContain('-m');
  });

  it('omits the model flag when model is null (auto)', () => {
    const args = startArgs(OFF, null);
    expect(args.some((a) => a.startsWith('--model'))).toBe(false);
    expect(args).not.toContain('-m');
  });
});

describe('antigravity buildResumeArgs — session targeting', () => {
  // agy exposes its conversation id in the stream-json output, so a session
  // recorded after that resumes exactly, from any cwd.
  it('resumes a recorded conversation id with --conversation', () => {
    const args = resumeArgs(OFF, null, 'd8012e6e-ff19-4e8c-9041-3d1b8b97708d');
    expect(args[args.indexOf('--conversation') + 1]).toBe(
      'd8012e6e-ff19-4e8c-9041-3d1b8b97708d',
    );
    expect(args).not.toContain('--continue');
  });

  // Sessions started before that recorded the isolated cwd as their ref; those
  // keep resuming through --continue (most recent conversation in that cwd).
  it('falls back to --continue for a legacy cwd ref', () => {
    const args = resumeArgs(OFF, null, '/tmp/antigravity-cwd/legacy-session');
    expect(args).toContain('--continue');
    expect(args).not.toContain('--conversation');
  });
});

describe('antigravity buildResumeArgs', () => {
  it('starts with --continue -p <prompt> and streams its output', () => {
    expect(resumeArgs(OFF).slice(0, 5)).toEqual([
      '--continue',
      '-p',
      'hi',
      '--output-format',
      'stream-json',
    ]);
  });

  it('carries the tier ceiling as --print-timeout on resume too', () => {
    const args = resumeArgs(OFF);
    expect(args[args.indexOf('--print-timeout') + 1]).toBe('10s');
  });

  it('appends --model=<name> when a model name is given', () => {
    expect(resumeArgs(OFF, 'Gemini 3.1 Pro')).toContain(
      '--model=Gemini 3.1 Pro',
    );
  });

  it('carries both --sandbox and --dangerously-skip-permissions when set', () => {
    const args = resumeArgs({ sandbox: true, skip_permissions: true });
    expect(args).toContain('--sandbox');
    expect(args).toContain('--dangerously-skip-permissions');
  });
});

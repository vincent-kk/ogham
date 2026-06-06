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
    model: 'auto',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
  };
  return buildStartArgs(opts, model);
}

function resumeArgs(
  flags: AntigravityFlags,
  model: string | null = null,
): string[] {
  const opts: DispatchResumeOptions<AntigravityFlags> = {
    prompt: 'hi',
    model: 'auto',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    externalSessionRef: '/tmp/cwd',
  };
  return buildResumeArgs(opts, model);
}

describe('antigravity buildStartArgs', () => {
  it('starts with -p <prompt> --output-format json', () => {
    expect(startArgs(OFF).slice(0, 4)).toEqual([
      '-p',
      'hi',
      '--output-format',
      'json',
    ]);
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

  it('appends -m <model> when a model name is given', () => {
    const args = startArgs(OFF, 'Gemini 3.1 Pro');
    const i = args.indexOf('-m');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(args[i + 1]).toBe('Gemini 3.1 Pro');
  });

  it('omits -m when model is null (auto)', () => {
    expect(startArgs(OFF, null)).not.toContain('-m');
  });
});

describe('antigravity buildResumeArgs', () => {
  it('starts with --continue -p <prompt> --output-format json', () => {
    expect(resumeArgs(OFF).slice(0, 5)).toEqual([
      '--continue',
      '-p',
      'hi',
      '--output-format',
      'json',
    ]);
  });

  it('carries the same permission flags as start', () => {
    const args = resumeArgs({ sandbox: true, skip_permissions: true });
    expect(args).toContain('--sandbox');
    expect(args).toContain('--dangerously-skip-permissions');
  });
});

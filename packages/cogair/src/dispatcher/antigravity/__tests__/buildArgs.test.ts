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
    spawnTimeoutMs: 10000,
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
    spawnTimeoutMs: 10000,
  };
  return buildResumeArgs(opts, model);
}

describe('antigravity buildStartArgs', () => {
  it('starts with -p <prompt> and no --output-format', () => {
    expect(startArgs(OFF).slice(0, 2)).toEqual(['-p', 'hi']);
    expect(startArgs(OFF)).not.toContain('--output-format');
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

describe('antigravity buildResumeArgs', () => {
  it('starts with --continue -p <prompt> and no --output-format', () => {
    expect(resumeArgs(OFF).slice(0, 3)).toEqual(['--continue', '-p', 'hi']);
    expect(resumeArgs(OFF)).not.toContain('--output-format');
  });

  it('appends --model=<name> when a model name is given', () => {
    expect(resumeArgs(OFF, 'Gemini 3.1 Pro')).toContain(
      '--model=Gemini 3.1 Pro',
    );
  });

  it('carries the same permission flags as start', () => {
    const args = resumeArgs({ sandbox: true, skip_permissions: true });
    expect(args).toContain('--sandbox');
    expect(args).toContain('--dangerously-skip-permissions');
  });
});

import { describe, expect, it } from 'vitest';

import type {
  CodexFlags,
  DispatchOptions,
  DispatchResumeOptions,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';

const READ_ONLY: CodexFlags = { yolo: false, sandbox: 'read-only' };

function startArgs(flags: CodexFlags): string[] {
  const opts: DispatchOptions<CodexFlags> = {
    prompt: 'hi',
    model: 'auto',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    spawnTimeoutMs: 10000,
  };
  return buildStartArgs(opts);
}

function resumeArgs(flags: CodexFlags): string[] {
  const opts: DispatchResumeOptions<CodexFlags> = {
    prompt: 'hi',
    model: 'auto',
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    externalSessionRef: 'thread-id',
    spawnTimeoutMs: 10000,
  };
  return buildResumeArgs(opts);
}

describe('codex buildStartArgs', () => {
  it('always includes exec + --skip-git-repo-check + --json', () => {
    const args = startArgs(READ_ONLY);
    expect(args.slice(0, 3)).toEqual([
      'exec',
      '--skip-git-repo-check',
      '--json',
    ]);
  });

  it('does not emit --ask-for-approval', () => {
    expect(startArgs(READ_ONLY)).not.toContain('--ask-for-approval');
  });

  it('emits --yolo when flags.yolo=true (and skips --sandbox)', () => {
    const args = startArgs({ yolo: true, sandbox: 'workspace-write' });
    expect(args).toContain('--yolo');
    expect(args).not.toContain('--sandbox');
  });

  it('emits --sandbox <mode> when yolo=false and sandbox != "off"', () => {
    const args = startArgs({ yolo: false, sandbox: 'workspace-write' });
    const i = args.indexOf('--sandbox');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(args[i + 1]).toBe('workspace-write');
  });

  it('omits sandbox flag when sandbox="off"', () => {
    const args = startArgs({ yolo: false, sandbox: 'off' });
    expect(args).not.toContain('--sandbox');
    expect(args).not.toContain('--yolo');
  });

  it('places the prompt as the last positional', () => {
    const args = startArgs(READ_ONLY);
    expect(args[args.length - 1]).toBe('hi');
  });
});

describe('codex buildResumeArgs', () => {
  it('always includes exec resume + --json', () => {
    const args = resumeArgs(READ_ONLY);
    expect(args.slice(0, 3)).toEqual(['exec', 'resume', '--json']);
  });

  it('does not emit yolo / sandbox flags regardless of flags', () => {
    const args = resumeArgs({ yolo: true, sandbox: 'danger-full-access' });
    expect(args).not.toContain('--yolo');
    expect(args).not.toContain('--sandbox');
  });

  it('appends externalSessionRef then prompt as positionals', () => {
    const args = resumeArgs(READ_ONLY);
    expect(args.slice(-2)).toEqual(['thread-id', 'hi']);
  });
});

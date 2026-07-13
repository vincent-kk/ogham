import { describe, expect, it } from 'vitest';

import type {
  CodexFlags,
  CodexModelMap,
  DispatchOptions,
  DispatchResumeOptions,
  Tier,
} from '../../../types/index.js';
import { resolveCodexTier } from '../operations/resolveTier.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';

const READ_ONLY: CodexFlags = { yolo: false, sandbox: 'read-only' };

const MODEL_MAP: CodexModelMap = {
  high: { model: 'gpt-5.6-sol', effort: 'max' },
  mid: { model: 'gpt-5.6-terra', effort: 'medium' },
  low: { model: 'gpt-5.6-luna', effort: 'medium' },
};

function startWith(
  flags: CodexFlags,
  tier: Tier,
  modelMap: CodexModelMap | undefined,
): string[] {
  const opts: DispatchOptions<CodexFlags, CodexModelMap> = {
    prompt: 'hi',
    tier,
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    spawnTimeoutMs: 10000,
    modelMap,
  };
  return buildStartArgs(opts, resolveCodexTier(tier, modelMap));
}

function resumeWith(
  flags: CodexFlags,
  tier: Tier,
  modelMap: CodexModelMap | undefined,
): string[] {
  const opts: DispatchResumeOptions<CodexFlags, CodexModelMap> = {
    prompt: 'hi',
    tier,
    options: {},
    sessionId: 's',
    cwd: '/tmp',
    flags,
    externalSessionRef: 'thread-id',
    spawnTimeoutMs: 10000,
    modelMap,
  };
  return buildResumeArgs(opts, resolveCodexTier(tier, modelMap));
}

function startArgs(flags: CodexFlags, tier: Tier = 'mid'): string[] {
  return startWith(flags, tier, MODEL_MAP);
}

function resumeArgs(flags: CodexFlags, tier: Tier = 'mid'): string[] {
  return resumeWith(flags, tier, MODEL_MAP);
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

  it('sends the tier model with -m and its effort with -c', () => {
    const args = startArgs(READ_ONLY, 'high');
    const model = args.indexOf('-m');
    const config = args.indexOf('-c');
    expect(args[model + 1]).toBe('gpt-5.6-sol');
    expect(args[config + 1]).toBe('model_reasoning_effort=max');
  });

  it('gives each tier its own model and effort', () => {
    expect(startArgs(READ_ONLY, 'mid')).toEqual(
      expect.arrayContaining([
        'gpt-5.6-terra',
        'model_reasoning_effort=medium',
      ]),
    );
    expect(startArgs(READ_ONLY, 'low')).toEqual(
      expect.arrayContaining(['gpt-5.6-luna', 'model_reasoning_effort=medium']),
    );
  });

  it('omits -m and -c with no model map, deferring to ~/.codex/config.toml', () => {
    const args = startWith(READ_ONLY, 'high', undefined);
    expect(args).not.toContain('-m');
    expect(args).not.toContain('-c');
  });

  it('omits -c when a tier configures a model but no effort', () => {
    const args = startWith(READ_ONLY, 'high', {
      ...MODEL_MAP,
      high: { model: 'gpt-5.5' },
    });
    expect(args).toContain('gpt-5.5');
    expect(args).not.toContain('-c');
  });
});

describe('codex buildResumeArgs', () => {
  it('always includes exec resume + --skip-git-repo-check + --json', () => {
    const args = resumeArgs(READ_ONLY);
    expect(args.slice(0, 4)).toEqual([
      'exec',
      'resume',
      '--skip-git-repo-check',
      '--json',
    ]);
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

  it('carries the tier model and effort into the resumed turn', () => {
    const args = resumeArgs(READ_ONLY, 'high');
    expect(args).toEqual(
      expect.arrayContaining([
        '-m',
        'gpt-5.6-sol',
        '-c',
        'model_reasoning_effort=max',
      ]),
    );
  });
});

import { describe, expect, it } from 'vitest';

import type {
  ClaudeFlags,
  ClaudeModelMap,
  DispatchOptions,
  DispatchResumeOptions,
} from '../../../types/index.js';
import { buildResumeArgs } from '../utils/buildResumeArgs.js';
import { buildStartArgs } from '../utils/buildStartArgs.js';

function baseArgs(
  flags: ClaudeFlags,
): DispatchOptions<ClaudeFlags, ClaudeModelMap> {
  return {
    prompt: 'hello',
    tier: 'high',
    options: {},
    sessionId: 'sess-1',
    cwd: '/tmp',
    flags,
    spawnTimeoutMs: 1000,
  };
}

const after = (argv: string[], flag: string): string | undefined =>
  argv[argv.indexOf(flag) + 1];

describe('buildStartArgs', () => {
  it('sends -p/json/session-id/model/effort/permission-mode + isolation flags', () => {
    const argv = buildStartArgs(baseArgs({ permission_mode: 'acceptEdits' }), {
      model: 'opus',
      effort: 'max',
    });
    expect(argv).toContain('-p');
    expect(after(argv, '--output-format')).toBe('json');
    expect(after(argv, '--session-id')).toBe('sess-1');
    expect(after(argv, '--permission-mode')).toBe('acceptEdits');
    expect(after(argv, '--model')).toBe('opus');
    expect(after(argv, '--effort')).toBe('max');
    expect(argv).toContain('--strict-mcp-config');
    expect(argv).toContain('--safe-mode');
    expect(argv).not.toContain('--resume');
  });

  it('omits --effort when the resolved tier has none', () => {
    const argv = buildStartArgs(baseArgs({ permission_mode: 'dontAsk' }), {
      model: 'haiku',
    });
    expect(after(argv, '--model')).toBe('haiku');
    expect(argv).not.toContain('--effort');
  });

  it('adds --fallback-model when configured', () => {
    const argv = buildStartArgs(
      baseArgs({ permission_mode: 'acceptEdits', fallback_model: 'sonnet' }),
      { model: 'opus', effort: 'high' },
    );
    expect(after(argv, '--fallback-model')).toBe('sonnet');
  });
});

describe('buildResumeArgs', () => {
  it('sends --resume <ref> and isolation flags, without --session-id/--fallback-model', () => {
    const args: DispatchResumeOptions<ClaudeFlags, ClaudeModelMap> = {
      ...baseArgs({ permission_mode: 'acceptEdits', fallback_model: 'sonnet' }),
      externalSessionRef: 'prior-id',
    };
    const argv = buildResumeArgs(args, { model: 'opus', effort: 'max' });
    expect(after(argv, '--resume')).toBe('prior-id');
    expect(argv).not.toContain('--session-id');
    expect(argv).not.toContain('--fallback-model');
    expect(argv).toContain('--strict-mcp-config');
    expect(argv).toContain('--safe-mode');
  });
});

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import type { HookOutput } from '../../../types/hooks.js';
import { processBashOutcome } from '../postToolUse.js';

/**
 * The failure-chain signal. Its whole risk is misfiring into a deliberate
 * red — the implement discipline asks for exactly that — so the cases
 * that matter are the ones that keep it quiet: below the threshold, after
 * a success, at advisory, and on a second sighting of a command already
 * mentioned.
 */
describe('bash failure chain', () => {
  const tempDirs: string[] = [];
  const SESSION = 'session-a';
  const COMMAND = 'yarn test:run';

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(intervention: InterventionLevel = 'standard'): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-signals-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    writeConfig(repoRoot, { intervention });
    return repoRoot;
  }

  function fail(
    cwd: string,
    command = COMMAND,
    extra: Record<string, unknown> = {},
  ): HookOutput {
    return processBashOutcome({
      cwd,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command },
      error: 'Exit code 1',
      ...extra,
    });
  }

  function succeed(cwd: string, command = COMMAND): HookOutput {
    return processBashOutcome({
      cwd,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command },
      tool_response: { stdout: '', stderr: '' },
    });
  }

  function injected(output: HookOutput): string | undefined {
    return output.hookSpecificOutput?.additionalContext;
  }

  it('stays quiet until the same command has failed enough times', () => {
    const repoRoot = seedRepo();
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toContain('trace-cause');
  });

  it('counts each command separately', () => {
    const repoRoot = seedRepo();
    fail(repoRoot, 'a');
    fail(repoRoot, 'b');
    fail(repoRoot, 'a');
    expect(injected(fail(repoRoot, 'b'))).toBeUndefined();
    expect(injected(fail(repoRoot, 'a'))).toContain('trace-cause');
  });

  it('says it once per command per session', () => {
    const repoRoot = seedRepo();
    fail(repoRoot);
    fail(repoRoot);
    expect(injected(fail(repoRoot))).toBeDefined();
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toBeUndefined();
  });

  it('forgets the chain once that command goes green', () => {
    const repoRoot = seedRepo();
    fail(repoRoot);
    fail(repoRoot);
    succeed(repoRoot);
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toContain('trace-cause');
  });

  it('does not count a run the user interrupted', () => {
    const repoRoot = seedRepo();
    fail(repoRoot, COMMAND, { is_interrupt: true });
    fail(repoRoot, COMMAND, { is_interrupt: true });
    expect(
      injected(fail(repoRoot, COMMAND, { is_interrupt: true })),
    ).toBeUndefined();
  });

  it('is silent at advisory and does not even keep count', () => {
    const repoRoot = seedRepo('advisory');
    fail(repoRoot);
    fail(repoRoot);
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(existsSync(join(repoRoot, '.seiri', 'session-signals.json'))).toBe(
      false,
    );
  });

  it('starts over rather than throwing when its own state file is damaged', () => {
    const repoRoot = seedRepo();
    fail(repoRoot);
    writeFileSync(
      join(repoRoot, '.seiri', 'session-signals.json'),
      '{ not json',
      'utf8',
    );

    expect(() => fail(repoRoot)).not.toThrow();
    expect(injected(fail(repoRoot))).toBeUndefined();
    expect(injected(fail(repoRoot))).toContain('trace-cause');
  });
});

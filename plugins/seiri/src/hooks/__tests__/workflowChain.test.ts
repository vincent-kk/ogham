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

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../types/config.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

/**
 * The hook state chain: PostToolUse observes which workflow loaded, the
 * next turn says once what that state owes. Its risk is turning into a
 * banner, so the cases that matter are the quiet ones — said once per
 * load, nothing at advisory, nothing for a skill outside the chain, and
 * the reminder surviving a damaged state file.
 */
describe('workflow state chain', () => {
  const tempDirs: string[] = [];
  const SESSION = 'session-a';

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(intervention: InterventionLevel = 'standard'): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-chain-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    writeConfig(repoRoot, { intervention });
    return repoRoot;
  }

  function load(cwd: string, skill: unknown): void {
    processToolOutcome({
      cwd,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Skill',
      tool_input: { skill },
      tool_response: {},
    });
  }

  function turn(cwd: string): string {
    const output = processUserPromptSubmit({
      cwd,
      session_id: SESSION,
      hook_event_name: 'UserPromptSubmit',
    });
    expect(output.continue).toBe(true);
    return output.hookSpecificOutput?.additionalContext ?? '';
  }

  it('tells the next turn what the loaded workflow owes', () => {
    const repoRoot = seedRepo();
    load(repoRoot, 'seiri:write-plan');
    expect(turn(repoRoot)).toContain('/seiri:execute');
  });

  it('says it once per load, not once per turn', () => {
    const repoRoot = seedRepo();
    load(repoRoot, 'seiri:implement');
    expect(turn(repoRoot)).toContain('A change was implemented');
    expect(turn(repoRoot)).not.toContain('A change was implemented');

    load(repoRoot, 'seiri:implement');
    expect(turn(repoRoot)).toContain('A change was implemented');
  });

  it('keeps the turn reminder even with no state to add', () => {
    const context = turn(seedRepo());
    expect(context).toContain('elect');
    expect(context.split('\n')).toHaveLength(1);
  });

  it('stays silent at advisory and writes no state at all', () => {
    const repoRoot = seedRepo('advisory');
    load(repoRoot, 'seiri:write-plan');
    expect(existsSync(join(repoRoot, '.seiri', 'session-signals.json'))).toBe(
      false,
    );
    expect(turn(repoRoot)).toBe('');
  });

  it('records nothing for a skill outside the workflow chain', () => {
    const repoRoot = seedRepo();
    for (const skill of ['seiri:setup', 'filid:scan', 42, undefined])
      load(repoRoot, skill);
    expect(turn(repoRoot).split('\n')).toHaveLength(1);
  });

  it('drops the clause rather than the turn when its state is damaged', () => {
    const repoRoot = seedRepo();
    load(repoRoot, 'seiri:verify');
    writeFileSync(
      join(repoRoot, '.seiri', 'session-signals.json'),
      '{ not json',
      'utf8',
    );

    const context = turn(repoRoot);
    expect(context).toContain('elect');
    expect(context.split('\n')).toHaveLength(1);
  });
});

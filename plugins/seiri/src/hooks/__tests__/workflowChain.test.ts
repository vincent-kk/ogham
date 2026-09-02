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

  function seedRepo(
    intervention: InterventionLevel | null = 'standard',
  ): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-chain-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    if (intervention !== null)
      writeConfig(repoRoot, 'project', { intervention });
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
    expect(turn(repoRoot)).toContain('/seiri:review-plan');
  });

  it('hands a reviewed plan onward to execute', () => {
    const repoRoot = seedRepo();
    load(repoRoot, 'seiri:review-plan');
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

  it('adds one reminder for one unmet ledger', () => {
    const repoRoot = seedRepo();
    const taskDir = join(repoRoot, '.seiri', 'tasks', 'payment-refactor');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'gates.md'),
      `- [x] G1: unit verification passes
  EVIDENCE: 8/8 passed
- [ ] G2: integration verification passes
  EVIDENCE: pending
`,
    );

    const context = turn(repoRoot);
    expect(context).toContain(
      'Ledger payment-refactor: 1/2 met — next G2; `/seiri:execute` owns it.',
    );
    expect(context.split('\n')).toHaveLength(2);
  });

  it('adds one aggregate reminder for two unmet ledgers', () => {
    const repoRoot = seedRepo();
    const loginDir = join(repoRoot, '.seiri', 'tasks', 'login-fix');
    const paymentDir = join(repoRoot, '.seiri', 'tasks', 'payment-refactor');
    mkdirSync(loginDir, { recursive: true });
    mkdirSync(paymentDir, { recursive: true });
    writeFileSync(
      join(loginDir, 'gates.md'),
      `- [ ] G1: login verification passes
  EVIDENCE: pending
`,
    );
    writeFileSync(
      join(paymentDir, 'gates.md'),
      `- [x] G1: unit verification passes
  EVIDENCE: 8/8 passed
- [ ] G2: integration verification passes
  EVIDENCE: pending
`,
    );

    const context = turn(repoRoot);
    const ledgerLines = context
      .split('\n')
      .filter((line) => line.startsWith('[seiri] Ledgers: '));
    expect(ledgerLines).toEqual([
      '[seiri] Ledgers: login-fix 0/1, payment-refactor 1/2 — `/seiri:execute` owns them.',
    ]);
  });

  it('omits the ledger reminder when every gate is met', () => {
    const repoRoot = seedRepo();
    const taskDir = join(repoRoot, '.seiri', 'tasks', 'payment-refactor');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'gates.md'),
      `- [x] G1: verification passes
  EVIDENCE: 8/8 passed
`,
    );

    const context = turn(repoRoot);
    expect(context).not.toContain('Ledger');
    expect(context.split('\n')).toHaveLength(1);
  });

  it('stays silent at advisory and writes no state at all', () => {
    const repoRoot = seedRepo('advisory');
    const taskDir = join(repoRoot, '.seiri', 'tasks', 'payment-refactor');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(
      join(taskDir, 'gates.md'),
      `- [ ] G1: verification passes
  EVIDENCE: pending
`,
    );
    load(repoRoot, 'seiri:write-plan');
    expect(existsSync(join(repoRoot, '.seiri', 'session-signals.json'))).toBe(
      false,
    );
    expect(turn(repoRoot)).toBe('');
  });

  it('keeps an unconfigured repository skill-only by default', () => {
    const repoRoot = seedRepo(null);
    load(repoRoot, 'seiri:write-plan');
    expect(existsSync(join(repoRoot, '.seiri', 'session-signals.json'))).toBe(
      false,
    );
    expect(turn(repoRoot)).toBe('');
  });

  it('preserves pending workflow state while hooks are off', () => {
    const repoRoot = seedRepo();
    const statePath = join(repoRoot, '.seiri', 'session-signals.json');
    load(repoRoot, 'seiri:write-plan');
    expect(existsSync(statePath)).toBe(true);

    writeConfig(repoRoot, 'project', { intervention: 'off' });
    expect(turn(repoRoot)).toBe('');
    expect(existsSync(statePath)).toBe(true);

    writeConfig(repoRoot, 'project', { intervention: 'standard' });
    expect(turn(repoRoot)).toContain('/seiri:review-plan');
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

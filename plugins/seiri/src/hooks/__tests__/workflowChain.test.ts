import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../types/config.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

/** Projects created by the observation-only skill cases. */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** Create a dial-controlled project without any selected workflow. */
function seedRepo(intervention: InterventionLevel | null = 'standard'): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-chain-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  if (intervention !== null) writeConfig(cwd, 'project', { intervention });
  return cwd;
}

/** Submit a native user boundary without selecting a skill. */
function turn(cwd: string) {
  return processUserPromptSubmit({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'UserPromptSubmit',
  });
}

/** The obsolete Skill transport must neither enroll nor infer progress. */
function load(cwd: string, skill: unknown) {
  return processToolOutcome({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    tool_use_id: 'skill-a',
    hook_event_name: 'PostToolUse',
    tool_name: 'Skill',
    tool_input: { skill },
    tool_response: {},
  });
}

/** Seed a local ledger without implying participation in its task. */
function ledger(cwd: string, task: string, checked = false): string {
  const dir = portableJoin(cwd, '.seiri', 'tasks', task);
  mkdirSync(dir, { recursive: true });
  const path = portableJoin(dir, 'gates.md');
  writeFileSync(
    path,
    `- [${checked ? 'x' : ' '}] G1: verification\n  EVIDENCE: ${checked ? 'observed' : 'pending'}\n`,
  );
  return path;
}

describe('skill loading does not create workflow participation', () => {
  it.each(['seiri:write-plan', 'seiri:review-plan', 'seiri:implement'])(
    'does not infer progress from %s',
    (skill) => {
      const cwd = seedRepo();
      expect(load(cwd, skill)).toEqual({ continue: true });
      expect(
        existsSync(portableJoin(cwd, '.seiri', 'session-signals.json')),
      ).toBe(false);
      expect(turn(cwd)).toEqual({ continue: true });
      const sessions = portableJoin(cwd, '.seiri', 'sessions');
      for (const name of readdirSync(sessions))
        if (name.endsWith('.json'))
          expect(
            JSON.parse(readFileSync(portableJoin(sessions, name), 'utf8'))
              .binding,
          ).toBeUndefined();
    },
  );

  it('does not repeatedly announce a loaded skill', () => {
    const cwd = seedRepo();
    for (let index = 0; index < 3; index++) {
      expect(load(cwd, 'seiri:verify')).toEqual({ continue: true });
      expect(turn(cwd)).toEqual({ continue: true });
    }
  });

  it('does not announce a pending ledger', () => {
    const cwd = seedRepo();
    const path = ledger(cwd, 'payment-refactor');
    const before = readFileSync(path, 'utf8');
    expect(turn(cwd)).toEqual({ continue: true });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('does not announce multiple unrelated ledgers', () => {
    const cwd = seedRepo();
    ledger(cwd, 'login-fix');
    ledger(cwd, 'payment-refactor');
    expect(turn(cwd)).toEqual({ continue: true });
  });

  it('does not announce a completed ledger', () => {
    const cwd = seedRepo();
    ledger(cwd, 'payment-refactor', true);
    expect(turn(cwd)).toEqual({ continue: true });
  });

  it.each(['off', 'advisory', null] as const)(
    'creates no state for a disabled or unconfigured project: %s',
    (dial) => {
      const cwd = seedRepo(dial);
      load(cwd, 'seiri:write-plan');
      expect(turn(cwd)).toEqual({ continue: true });
      expect(existsSync(portableJoin(cwd, '.seiri', 'sessions'))).toBe(false);
    },
  );

  it('does not revive legacy Skill state after an off round trip', () => {
    const cwd = seedRepo();
    const path = portableJoin(cwd, '.seiri', 'session-signals.json');
    const legacy = JSON.stringify({
      sessionId: 'session-a',
      counts: {},
      announced: [],
      workflow: { skill: 'write-plan', announced: false },
    });
    writeFileSync(path, legacy);
    writeConfig(cwd, 'project', { intervention: 'off' });
    expect(turn(cwd)).toEqual({ continue: true });
    writeConfig(cwd, 'project', { intervention: 'standard' });
    expect(turn(cwd)).toEqual({ continue: true });
    expect(readFileSync(path, 'utf8')).toBe(legacy);
  });

  it('ignores unrelated and malformed Skill arguments', () => {
    const cwd = seedRepo();
    for (const skill of ['seiri:setup', 'filid:scan', 42, undefined])
      expect(load(cwd, skill)).toEqual({ continue: true });
    expect(turn(cwd)).toEqual({ continue: true });
  });

  it('does not fall back to election when legacy state is damaged', () => {
    const cwd = seedRepo();
    writeFileSync(
      portableJoin(cwd, '.seiri', 'session-signals.json'),
      '{ not json',
    );
    expect(turn(cwd)).toEqual({ continue: true });
  });
});

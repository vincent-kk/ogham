import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../types/config.js';
import { processSessionStart } from '../setup/setup.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { activateWorkflow } from './helpers/workflowHarness.js';

const roots: string[] = [];
function fixture(intervention: InterventionLevel = 'standard') {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-boundary-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention });
  return cwd;
}
function sessionState(cwd: string) {
  const dir = portableJoin(cwd, '.seiri/sessions');
  const name = readdirSync(dir).find((entry) => entry.endsWith('.json'))!;
  return JSON.parse(readFileSync(portableJoin(dir, name), 'utf8'));
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('keeps an active binding across a new user turn at standard', () => {
  const cwd = fixture('standard');
  activateWorkflow(cwd);
  processUserPromptSubmit({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-b',
    hook_event_name: 'UserPromptSubmit',
  });
  expect(sessionState(cwd).binding.state).toBe('active');
});
it.each(['off', 'advisory'] as const)(
  'suspends an active binding at a new user turn when the dial is %s',
  (dial) => {
    const cwd = fixture('standard');
    activateWorkflow(cwd);
    writeConfig(cwd, 'project', { intervention: dial });
    processUserPromptSubmit({
      cwd,
      session_id: 'session-a',
      prompt_id: 'turn-b',
      hook_event_name: 'UserPromptSubmit',
    });
    expect(sessionState(cwd).binding.state).toBe('suspended');
  },
);
it.each(['startup', 'resume', 'clear', 'fork'] as const)(
  'a SessionStart %s suspends an existing binding',
  (source) => {
    const cwd = fixture('standard');
    activateWorkflow(cwd);
    processSessionStart({
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SessionStart',
      source,
    });
    expect(sessionState(cwd).binding.state).toBe('suspended');
  },
);
it('a compact SessionStart leaves an active binding untouched', () => {
  const cwd = fixture('standard');
  activateWorkflow(cwd);
  processSessionStart({
    cwd,
    session_id: 'session-a',
    hook_event_name: 'SessionStart',
    source: 'compact',
  });
  expect(sessionState(cwd).binding.state).toBe('active');
});

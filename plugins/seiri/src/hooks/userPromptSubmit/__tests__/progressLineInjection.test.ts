import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import { activateWorkflow } from '../../__tests__/helpers/workflowHarness.js';
import { processToolOutcome } from '../../postToolUse/postToolUse.js';
import { processToolStart } from '../../preToolUse/preToolUse.js';
import { renderChainLine } from '../../shared/progressLine/renderChainLine.js';
import { renderProgressLine } from '../../shared/progressLine/renderProgressLine.js';
import { processUserPromptSubmit } from '../userPromptSubmit.js';

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

function seedRepo(intervention: InterventionLevel): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-ups-progress-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention });
  return cwd;
}

function pause(cwd: string, task: string) {
  const invocation = {
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    tool_use_id: 'pause-it',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: { action: 'pause', project_root: cwd, task },
  };
  processToolStart({ ...invocation, hook_event_name: 'PreToolUse' });
  processToolOutcome({
    ...invocation,
    hook_event_name: 'PostToolUse',
    tool_response: [
      {
        type: 'text',
        text: JSON.stringify({ status: 'accepted', action: 'pause', task }),
      },
    ],
  });
}

function nextTurn(cwd: string) {
  return processUserPromptSubmit({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-b',
    hook_event_name: 'UserPromptSubmit',
  });
}

it.each(['standard', 'strict'] as const)(
  'an active binding gets a progress line at %s',
  (intervention) => {
    const cwd = seedRepo(intervention);
    activateWorkflow(cwd, { task: 'payment-refactor' });
    expect(nextTurn(cwd).hookSpecificOutput?.additionalContext).toBe(
      renderProgressLine('payment-refactor', 'change'),
    );
  },
);

it('a paused binding at standard injects nothing', () => {
  const cwd = seedRepo('standard');
  activateWorkflow(cwd, { task: 'payment-refactor' });
  pause(cwd, 'payment-refactor');
  expect(nextTurn(cwd)).toEqual({ continue: true });
});

it('a paused binding at strict falls back to the chain line', () => {
  const cwd = seedRepo('strict');
  activateWorkflow(cwd, { task: 'payment-refactor' });
  pause(cwd, 'payment-refactor');
  expect(nextTurn(cwd).hookSpecificOutput?.additionalContext).toBe(
    renderChainLine(),
  );
});

it('no binding at standard injects nothing', () => {
  expect(nextTurn(seedRepo('standard'))).toEqual({ continue: true });
});

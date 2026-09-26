import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { INJECTION_PREFIX } from '../../constants/plugin.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processToolStart } from '../preToolUse/preToolUse.js';

import { activateWorkflow, observeBash } from './helpers/workflowHarness.js';

const roots: string[] = [];
function fixture() {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-scope-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  for (const task of ['task-a', 'task-b']) {
    const dir = portableJoin(cwd, '.seiri/tasks', task);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      portableJoin(dir, 'gates.md'),
      '- [ ] G1: passes\n  CHECK: echo OK\n  EXPECT: OK\n',
    );
  }
  writeFileSync(
    portableJoin(cwd, '.seiri/config.json'),
    '{"intervention":"standard"}',
  );
  expect(
    activateWorkflow(cwd, { task: 'task-a' }).hookSpecificOutput
      ?.additionalContext,
  ).toContain('acknowledged');
  return {
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'PostToolUse' as const,
    tool_name: 'Bash',
    tool_input: { command: 'echo OK' },
    tool_response: { stdout: 'OK', exit_code: 0 },
  };
}
function ledger(cwd: string, task: string) {
  return readFileSync(
    portableJoin(cwd, '.seiri/tasks', task, 'gates.md'),
    'utf8',
  );
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

it('records only the active task when two ledgers contain the same CHECK', () => {
  const input = fixture();
  observeBash(input);
  expect(ledger(input.cwd, 'task-a')).toContain('[x] G1');
  expect(ledger(input.cwd, 'task-b')).toContain('[ ] G1');
});
it('suppresses repeated verdicts with identical evidence, while preserving regressions', () => {
  const input = fixture();
  expect(observeBash(input).hookSpecificOutput).toBeDefined();
  expect(
    observeBash({
      ...input,
      tool_response: { stdout: 'OK\nvolatile timing\nOK', exit_code: 0 },
    }).hookSpecificOutput,
  ).toBeUndefined();
  expect(
    observeBash({ ...input, tool_response: { stdout: 'failed', exit_code: 1 } })
      .hookSpecificOutput?.additionalContext,
  ).toContain('regress');
  expect(ledger(input.cwd, 'task-a')).toContain('[ ] G1');
});
it('does not apply a late Bash result after replacing its task', () => {
  const input = { ...fixture(), tool_use_id: 'late-bash' };
  processToolStart({ ...input, hook_event_name: 'PreToolUse' });
  const req = {
    action: 'start',
    project_root: input.cwd,
    task: 'task-b',
    intent: 'change',
  };
  const call = {
    ...input,
    tool_use_id: 'switch',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: req,
  };
  processToolStart({ ...call, hook_event_name: 'PreToolUse' });
  processToolOutcome({
    ...call,
    tool_response: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'start',
          task: 'task-b',
          intent: 'change',
        }),
      },
    ],
  });
  expect(processToolOutcome(input).hookSpecificOutput).toBeUndefined();
  expect(ledger(input.cwd, 'task-a')).toContain('[ ] G1');
  expect(ledger(input.cwd, 'task-b')).toContain('[ ] G1');
});
it('rejects resume for a different task with a mismatch result and leaves state untouched', () => {
  const input = fixture();
  const before = sessionState(input.cwd);
  const req = {
    action: 'resume',
    project_root: input.cwd,
    task: 'task-b',
    intent: 'change',
  };
  const call = {
    ...input,
    tool_use_id: 'resume-mismatch',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: req,
  };
  processToolStart({ ...call, hook_event_name: 'PreToolUse' });
  const result = processToolOutcome({
    ...call,
    tool_response: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'resume',
          task: 'task-b',
          intent: 'change',
        }),
      },
    ],
  });
  expect(result.hookSpecificOutput?.additionalContext).toBe(
    `${INJECTION_PREFIX} Workflow task-b: resume not applied; another task is bound — use start for new work.`,
  );
  const after = sessionState(input.cwd);
  expect(after.binding).toEqual(before.binding);
  expect(after.generation).toBe(before.generation);
  expect(after.invocations).toEqual(before.invocations);
});
it('does not record evidence if the task ledger lock is held', () => {
  const input = fixture();
  mkdirSync(portableJoin(input.cwd, '.seiri/tasks/task-a/gates.lock'));
  expect(observeBash(input).hookSpecificOutput).toBeUndefined();
  expect(ledger(input.cwd, 'task-a')).toContain('[ ] G1');
});
it('records into the physical workspace when the native cwd is a nested symlink', () => {
  const input = fixture();
  const sub = portableJoin(input.cwd, 'sub'); mkdirSync(sub);
  const outside = mkdtempSync(portableJoin(tmpdir(), 'seiri-scope-alias-')); roots.push(outside);
  const alias = portableJoin(outside, 'alias'); symlinkSync(sub, alias, 'junction');
  observeBash({ ...input, cwd: alias });
  expect(ledger(input.cwd, 'task-a')).toContain('[x] G1');
});
it('leaves a dial call unpaired: no invocation, no acknowledgment, no actor-state change', () => {
  const input = fixture();
  const before = sessionState(input.cwd);
  const call = {
    ...input,
    tool_use_id: 'dial-call',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: {
      action: 'dial',
      project_root: input.cwd,
      task: 'task-b',
      intent: 'change',
      dial_op: 'get',
    },
  };
  processToolStart({ ...call, hook_event_name: 'PreToolUse' });
  expect(sessionState(input.cwd)).toEqual(before);
  expect(
    processToolOutcome({
      ...call,
      tool_response: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'accepted',
            action: 'dial',
            task: 'task-b',
            intent: 'change',
          }),
        },
      ],
    }).hookSpecificOutput,
  ).toBeUndefined();
  expect(sessionState(input.cwd)).toEqual(before);
});

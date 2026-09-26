import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { controlVerbAck } from '../postToolUse/utils/controlVerbAck.js';
import { processToolStart } from '../preToolUse/preToolUse.js';
import { renderCreatedAck } from '../shared/progressLine/renderCreatedAck.js';
import { renderSwitchedAck } from '../shared/progressLine/renderSwitchedAck.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { activateWorkflow } from './helpers/workflowHarness.js';

const roots: string[] = [];
function fixture() {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-step-ack-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'standard' });
  return {
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
  };
}
/** Run one runtime call's paired Pre/Post lifecycle and return the Post result. */
function call(
  base: ReturnType<typeof fixture>,
  toolUseId: string,
  input: Record<string, unknown>,
  reply: Record<string, unknown>,
) {
  const invocation = {
    ...base,
    tool_use_id: toolUseId,
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: input,
  };
  processToolStart({ ...invocation, hook_event_name: 'PreToolUse' });
  return processToolOutcome({
    ...invocation,
    hook_event_name: 'PostToolUse',
    tool_response: [{ type: 'text', text: JSON.stringify(reply) }],
  });
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('a same-task non-entry step is silent, while resume and pause on the same task acknowledge with the control-verb text', () => {
  const base = fixture();
  expect(
    activateWorkflow(base.cwd, { task: 'task-a' }).hookSpecificOutput,
  ).toBeDefined();
  expect(
    call(
      base,
      'step-verify',
      {
        action: 'step',
        project_root: base.cwd,
        task: 'task-a',
        step: 'verify',
      },
      {
        status: 'accepted',
        action: 'step',
        task: 'task-a',
        step: 'verify',
        intent: 'change',
      },
    ).hookSpecificOutput,
  ).toBeUndefined();
  expect(
    call(
      base,
      'resume-same-task',
      {
        action: 'resume',
        project_root: base.cwd,
        task: 'task-a',
        intent: 'change',
      },
      {
        status: 'accepted',
        action: 'resume',
        task: 'task-a',
        intent: 'change',
      },
    ).hookSpecificOutput?.additionalContext,
  ).toBe(
    controlVerbAck({
      action: 'resume',
      project_root: base.cwd,
      task: 'task-a',
      intent: 'change',
    }),
  );
  expect(
    call(
      base,
      'pause-same-task',
      { action: 'pause', project_root: base.cwd, task: 'task-a' },
      { status: 'accepted', action: 'pause', task: 'task-a' },
    ).hookSpecificOutput?.additionalContext,
  ).toBe(
    controlVerbAck({ action: 'pause', project_root: base.cwd, task: 'task-a' }),
  );
});
it('an entry step for a different task switches, naming the old task; the created binding starts at that step', () => {
  const base = fixture();
  expect(
    activateWorkflow(base.cwd, { task: 'task-a' }).hookSpecificOutput,
  ).toBeDefined();
  const switched = call(
    base,
    'switch-to-b',
    {
      action: 'step',
      project_root: base.cwd,
      task: 'task-b',
      step: 'write-plan',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 'task-b',
      step: 'write-plan',
      intent: 'change',
    },
  );
  expect(switched.hookSpecificOutput?.additionalContext).toBe(
    renderSwitchedAck('task-b', 'task-a', 'change', 'write-plan'),
  );
});
it('an entry step with no prior binding creates one, in progress-line ACK shape', () => {
  const base = fixture();
  processUserPromptSubmit({
    ...base,
    hook_event_name: 'UserPromptSubmit',
  });
  const created = call(
    base,
    'create-task-a',
    {
      action: 'step',
      project_root: base.cwd,
      task: 'task-a',
      step: 'write-plan',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 'task-a',
      step: 'write-plan',
      intent: 'change',
    },
  );
  expect(created.hookSpecificOutput?.additionalContext).toBe(
    renderCreatedAck('task-a', 'change', 'write-plan'),
  );
});
it('finish clears a redundant in-flight entry step, leaving no ACK and no binding', () => {
  const base = fixture();
  expect(
    activateWorkflow(base.cwd, { task: 'task-a' }).hookSpecificOutput,
  ).toBeDefined();
  const stepInvocation = {
    ...base,
    tool_use_id: 'redundant-step',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: {
      action: 'step',
      project_root: base.cwd,
      task: 'task-a',
      step: 'write-plan',
    },
  };
  const finishInvocation = {
    ...base,
    tool_use_id: 'finish-task-a',
    tool_name: 'mcp__plugin_seiri_tools__runtime',
    tool_input: { action: 'finish', project_root: base.cwd, task: 'task-a' },
  };
  processToolStart({ ...stepInvocation, hook_event_name: 'PreToolUse' });
  processToolStart({ ...finishInvocation, hook_event_name: 'PreToolUse' });
  const finishResult = processToolOutcome({
    ...finishInvocation,
    hook_event_name: 'PostToolUse',
    tool_response: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'finish',
          task: 'task-a',
        }),
      },
    ],
  });
  expect(finishResult.hookSpecificOutput).toBeDefined();
  const stepResult = processToolOutcome({
    ...stepInvocation,
    hook_event_name: 'PostToolUse',
    tool_response: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'step',
          task: 'task-a',
          step: 'write-plan',
          intent: 'change',
        }),
      },
    ],
  });
  expect(stepResult.hookSpecificOutput).toBeUndefined();
});
it('a non-entry step with no prior binding is rejected: no ACK, no binding, and the next turn stays silent', () => {
  const base = fixture();
  processUserPromptSubmit({ ...base, hook_event_name: 'UserPromptSubmit' });
  const rejected = call(
    base,
    'no-prior-binding-step',
    {
      action: 'step',
      project_root: base.cwd,
      task: 'task-a',
      step: 'implement',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 'task-a',
      step: 'implement',
      intent: 'change',
    },
  );
  expect(rejected).toEqual({ continue: true });
  expect(
    processUserPromptSubmit({
      ...base,
      prompt_id: 'turn-b',
      hook_event_name: 'UserPromptSubmit',
    }),
  ).toEqual({ continue: true });
});

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import { activateWorkflow } from '../../__tests__/helpers/workflowHarness.js';
import { processToolOutcome } from '../../postToolUse/postToolUse.js';
import { processToolStart } from '../../preToolUse/preToolUse.js';
import { renderSubagentLine } from '../../shared/progressLine/renderSubagentLine.js';
import { CODEX_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/codex.js';
import { processSubagentStart } from '../subagentStart.js';

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

function seedRepo(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-subagent-progress-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  writeConfig(root, 'project', { intervention: 'standard' });
  return root;
}

function spawn(cwd: string, agentId: string) {
  return processSubagentStart({
    cwd,
    session_id: 'session-a',
    prompt_id: 'turn-a',
    agent_id: agentId,
    hook_event_name: 'SubagentStart',
  });
}

describe('subagent progress line', () => {
  it("hands the child one line naming the parent main actor's active task, once", () => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { task: 'payment-refactor' });
    const first = spawn(cwd, 'child-a');
    expect(first.hookSpecificOutput?.additionalContext).toBe(
      renderSubagentLine('payment-refactor', 'change'),
    );
  });

  it('gives a resumed child nothing on its second SubagentStart', () => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { task: 'payment-refactor' });
    spawn(cwd, 'child-a');
    expect(spawn(cwd, 'child-a')).toEqual({ continue: true });
  });

  it('gives the child nothing when the main actor has no active binding', () => {
    const cwd = seedRepo();
    expect(spawn(cwd, 'child-a')).toEqual({ continue: true });
  });

  it('ignores an active binding under a non-main actor', () => {
    const cwd = seedRepo();
    // A binding scoped to `child-a`'s own actor, never the session's main.
    activateWorkflow(cwd, { task: 'sibling-task', agent_id: 'child-a' });
    expect(spawn(cwd, 'child-b')).toEqual({ continue: true });
  });

  it('gives the child nothing when the main actor is paused', () => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { task: 'payment-refactor' });
    const invocation = {
      cwd,
      session_id: 'session-a',
      prompt_id: 'turn-a',
      tool_use_id: 'pause-it',
      tool_name: 'mcp__plugin_seiri_tools__runtime',
      tool_input: {
        action: 'pause',
        project_root: cwd,
        task: 'payment-refactor',
      },
    };
    processToolStart({ ...invocation, hook_event_name: 'PreToolUse' });
    processToolOutcome({
      ...invocation,
      hook_event_name: 'PostToolUse',
      tool_response: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'accepted',
            action: 'pause',
            task: 'payment-refactor',
          }),
        },
      ],
    });
    expect(spawn(cwd, 'child-a')).toEqual({ continue: true });
  });

  it('gives the child nothing once the dial turns off, even with a stored active binding', () => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { task: 'payment-refactor' });
    writeConfig(cwd, 'project', { intervention: 'off' });
    expect(spawn(cwd, 'child-a')).toEqual({ continue: true });
  });

  it("ignores an active binding stored under the other host's main actor", () => {
    const cwd = seedRepo();
    activateWorkflow(cwd, { task: 'payment-refactor' });
    expect(
      processSubagentStart(
        {
          cwd,
          session_id: 'session-a',
          turn_id: 'turn-a',
          agent_id: 'child-a',
          hook_event_name: 'SubagentStart',
        },
        CODEX_WORKFLOW_ADAPTER,
      ),
    ).toEqual({ continue: true });
  });
});

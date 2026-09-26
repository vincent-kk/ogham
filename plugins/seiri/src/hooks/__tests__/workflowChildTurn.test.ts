import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { WorkflowState } from '../../types/workflow.js';
import { processToolOutcome } from '../postToolUse/index.js';
import { processToolStart } from '../preToolUse/index.js';
import { renderCreatedAck } from '../shared/progressLine/renderCreatedAck.js';
import { renderSubagentLine } from '../shared/progressLine/renderSubagentLine.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { processSubagentStart } from '../subagentStart/index.js';
import { processUserPromptSubmit } from '../userPromptSubmit/index.js';

import { activateWorkflow } from './helpers/workflowHarness.js';

describe.each([
  { adapter: CLAUDE_WORKFLOW_ADAPTER, turnKey: 'prompt_id' },
  { adapter: CODEX_WORKFLOW_ADAPTER, turnKey: 'turn_id' },
] as const)('$adapter.name child turn isolation', ({ adapter, turnKey }) => {
  let cwd: string;
  let ledgerPath: string;

  beforeEach(() => {
    cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-child-turn-'));
    mkdirSync(portableJoin(cwd, '.git'));
    writeConfig(cwd, 'project', { intervention: 'standard' });
    const taskDir = portableJoin(cwd, '.seiri/tasks/child-task');
    mkdirSync(taskDir, { recursive: true });
    ledgerPath = portableJoin(taskDir, 'gates.md');
    writeFileSync(
      ledgerPath,
      '- [ ] G1: child check\n  CHECK: `echo OK`\n  EXPECT: `OK`\n',
    );
  });
  afterEach(() => rmSync(cwd, { recursive: true, force: true }));

  /** Read the isolated child state after hooks persist it. */
  function childState(): WorkflowState {
    const actor = workflowHash(
      JSON.stringify([adapter.name, 'session-a', 'child-a']),
    );
    const path = portableJoin(cwd, '.seiri/sessions', `${actor}.json`);
    return JSON.parse(readFileSync(path, 'utf8'));
  }

  it('records a CHECK across the parent turn change and acknowledges child finish', () => {
    activateWorkflow(cwd, { task: 'parent-task', [turnKey]: 'P1' });
    const child = {
      cwd,
      session_id: 'session-a',
      agent_id: 'child-a',
      [turnKey]: 'P1',
    };
    expect(
      processSubagentStart(
        { ...child, hook_event_name: 'SubagentStart' },
        adapter,
      ).hookSpecificOutput?.additionalContext,
    ).toBe(renderSubagentLine('parent-task', 'change'));

    const entry = {
      ...child,
      tool_use_id: 'child-entry',
      tool_name: adapter.runtimeTool,
      tool_input: {
        action: 'step',
        project_root: cwd,
        task: 'child-task',
        step: 'execute',
      },
    };
    processToolStart({ ...entry, hook_event_name: 'PreToolUse' }, adapter);
    const entryContent = [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'step',
          task: 'child-task',
          step: 'execute',
          intent: 'change',
        }),
      },
    ];
    expect(
      processToolOutcome(
        {
          ...entry,
          hook_event_name: 'PostToolUse',
          tool_response:
            adapter === CODEX_WORKFLOW_ADAPTER
              ? { content: entryContent }
              : entryContent,
        },
        adapter,
      ).hookSpecificOutput?.additionalContext,
    ).toBe(renderCreatedAck('child-task', 'change', 'execute'));
    expect(childState().binding).toMatchObject({
      task: 'child-task',
      state: 'active',
      step: 'execute',
    });

    const bash = {
      ...child,
      tool_use_id: 'child-check',
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
    };
    processToolStart({ ...bash, hook_event_name: 'PreToolUse' }, adapter);
    processUserPromptSubmit(
      {
        cwd,
        session_id: 'session-a',
        [turnKey]: 'P2',
        hook_event_name: 'UserPromptSubmit',
      },
      adapter,
    );
    processToolOutcome(
      {
        ...bash,
        [turnKey]: 'P2',
        hook_event_name: 'PostToolUse',
        tool_response: { stdout: 'OK', exit_code: 0 },
      },
      adapter,
    );
    expect.soft(readFileSync(ledgerPath, 'utf8')).toContain('[x] G1');

    const finish = {
      ...child,
      [turnKey]: 'P2',
      tool_use_id: 'child-finish',
      tool_name: adapter.runtimeTool,
      tool_input: { action: 'finish', project_root: cwd, task: 'child-task' },
    };
    processToolStart({ ...finish, hook_event_name: 'PreToolUse' }, adapter);
    const finishContent = [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'accepted',
          action: 'finish',
          task: 'child-task',
        }),
      },
    ];
    const finished = processToolOutcome(
      {
        ...finish,
        hook_event_name: 'PostToolUse',
        tool_response:
          adapter === CODEX_WORKFLOW_ADAPTER
            ? { content: finishContent }
            : finishContent,
      },
      adapter,
    );
    expect
      .soft(finished.hookSpecificOutput?.additionalContext)
      .toContain('finish');
    expect.soft(childState().binding).toBeUndefined();
  });

  it('drops a main actor Post from before the next UserPromptSubmit', () => {
    activateWorkflow(cwd, { task: 'child-task', [turnKey]: 'P1' });
    const bash = {
      cwd,
      session_id: 'session-a',
      [turnKey]: 'P1',
      tool_use_id: 'main-check',
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
    };
    processToolStart({ ...bash, hook_event_name: 'PreToolUse' }, adapter);
    processUserPromptSubmit(
      {
        cwd,
        session_id: 'session-a',
        [turnKey]: 'P2',
        hook_event_name: 'UserPromptSubmit',
      },
      adapter,
    );
    expect(
      processToolOutcome(
        {
          ...bash,
          [turnKey]: 'P2',
          hook_event_name: 'PostToolUse',
          tool_response: { stdout: 'OK', exit_code: 0 },
        },
        adapter,
      ),
    ).toEqual({ continue: true });
    expect(readFileSync(ledgerPath, 'utf8')).toContain('[ ] G1');
  });

  it('suspends a resumed child and rejects its pending Post despite the stable turn', () => {
    activateWorkflow(cwd, { task: 'parent-task', [turnKey]: 'P1' });
    activateWorkflow(cwd, {
      task: 'child-task',
      agent_id: 'child-a',
      [turnKey]: 'P1',
    });
    const child = {
      cwd,
      session_id: 'session-a',
      agent_id: 'child-a',
      [turnKey]: 'P1',
    };
    const bash = {
      ...child,
      tool_use_id: 'resumed-check',
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
    };
    processToolStart({ ...bash, hook_event_name: 'PreToolUse' }, adapter);
    const before = childState();
    expect(before.generation).toBeGreaterThan(0);
    expect(Object.keys(before.invocations)).toHaveLength(1);
    expect(
      processSubagentStart(
        { ...child, hook_event_name: 'SubagentStart' },
        adapter,
      ),
    ).toEqual({ continue: true });
    const resumed = childState();
    expect(resumed.generation).toBe(before.generation + 1);
    expect(resumed.binding?.state).toBe('suspended');
    expect(resumed.turn).toBeUndefined();
    expect(resumed.invocations).toEqual({});
    expect(
      processToolOutcome(
        {
          ...bash,
          hook_event_name: 'PostToolUse',
          tool_response: { stdout: 'OK', exit_code: 0 },
        },
        adapter,
      ),
    ).toEqual({ continue: true });
    expect(readFileSync(ledgerPath, 'utf8')).toContain('[ ] G1');
  });
});

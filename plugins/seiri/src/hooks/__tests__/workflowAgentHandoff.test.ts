import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../core/infra/configLoader/loaders/writeConfig.js';
import type { HookBaseInput } from '../../types/hooks.js';
import type { WorkflowHostAdapter } from '../../types/workflow.js';
import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processToolStart } from '../preToolUse/preToolUse.js';
import { renderChainLine } from '../shared/progressLine/renderChainLine.js';
import { renderCreatedAck } from '../shared/progressLine/renderCreatedAck.js';
import { renderProgressLine } from '../shared/progressLine/renderProgressLine.js';
import { renderSwitchedAck } from '../shared/progressLine/renderSwitchedAck.js';
import { CLAUDE_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/claude.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { workflowHash } from '../shared/workflowHost/workflowHash.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

import { observeBash } from './helpers/workflowHarness.js';

/**
 * Two independent hosts hand a task off to each other across separate
 * sessions: the actor identity `hash(host, session_id, agent_id ?? 'main')`
 * is the only thing that tells them apart, and the task ledger under
 * `.seiri/tasks/<task>` is the only state they share.
 */
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** A standard-dial repository with task-a's gates ledger seeded for CHECK recording. */
function fixture(): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-a2a-handoff-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'standard' });
  const dir = portableJoin(cwd, '.seiri/tasks/t-handoff');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    portableJoin(dir, 'gates.md'),
    '- [ ] G1: designer verdict\n  CHECK: echo OK\n  EXPECT: OK\n' +
      '- [ ] G2: implementer verdict\n  CHECK: echo OK2\n  EXPECT: OK2\n',
  );
  return cwd;
}

/** This task's ledger contents, shared by whichever actor is bound to it. */
function ledger(cwd: string): string {
  return readFileSync(
    portableJoin(cwd, '.seiri/tasks/t-handoff/gates.md'),
    'utf8',
  );
}

/** The actor state file's raw bytes, addressed by its precomputed hashed identity. */
function actorRaw(cwd: string, actor: string): string {
  return readFileSync(
    portableJoin(cwd, '.seiri/sessions', `${actor}.json`),
    'utf8',
  );
}

/** The actor's parsed binding, or undefined when none is active. */
function actorBinding(cwd: string, actor: string) {
  return JSON.parse(actorRaw(cwd, actor)).binding;
}

/** The hashed actor identity a real host session resolves to; `main` unless a subagent. */
function actor(host: 'claude' | 'codex', sessionId: string): string {
  return workflowHash(JSON.stringify([host, sessionId, 'main']));
}

/** One paired runtime call, mirroring each adapter's native turn/reply shape. */
function runtimeCall(
  adapter: WorkflowHostAdapter,
  native: Omit<HookBaseInput, 'hook_event_name'>,
  toolUseId: string,
  input: Record<string, unknown>,
  reply: Record<string, unknown>,
) {
  const invocation = {
    ...native,
    tool_use_id: toolUseId,
    tool_name: adapter.runtimeTool,
    tool_input: input,
  };
  processToolStart({ ...invocation, hook_event_name: 'PreToolUse' }, adapter);
  const content = [{ type: 'text', text: JSON.stringify(reply) }];
  return processToolOutcome(
    {
      ...invocation,
      hook_event_name: 'PostToolUse',
      tool_response: adapter === CODEX_WORKFLOW_ADAPTER ? { content } : content,
    },
    adapter,
  );
}

it('(a) a designer session and an implementer session on separate hosts each create their own binding for the same task', () => {
  const cwd = fixture();
  const a = { cwd, session_id: 'session-a', prompt_id: 'turn-a1' };
  processUserPromptSubmit(
    { ...a, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  const created = runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    a,
    'a-write-plan',
    {
      action: 'step',
      project_root: cwd,
      task: 't-handoff',
      step: 'write-plan',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'write-plan',
      intent: 'change',
    },
  );
  expect(created.hookSpecificOutput?.additionalContext).toBe(
    renderCreatedAck('t-handoff', 'change', 'write-plan'),
  );

  const b = { cwd, session_id: 'session-b', turn_id: 'turn-b1' };
  processUserPromptSubmit(
    { ...b, hook_event_name: 'UserPromptSubmit' },
    CODEX_WORKFLOW_ADAPTER,
  );
  const createdB = runtimeCall(
    CODEX_WORKFLOW_ADAPTER,
    b,
    'b-execute',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'execute',
      intent: 'change',
    },
  );
  expect(createdB.hookSpecificOutput?.additionalContext).toBe(
    renderCreatedAck('t-handoff', 'change', 'execute'),
  );

  const actorA = actor('claude', 'session-a');
  const actorB = actor('codex', 'session-b');
  expect(actorBinding(cwd, actorA)).toMatchObject({
    task: 't-handoff',
    state: 'active',
    step: 'write-plan',
  });
  expect(actorBinding(cwd, actorB)).toMatchObject({
    task: 't-handoff',
    state: 'active',
    step: 'execute',
  });
});

it('(b) a CHECK-matching Bash in the implementer session records into the shared ledger, leaves the designer actor untouched, and the designer keeps seeing its own step', () => {
  const cwd = fixture();
  const a = { cwd, session_id: 'session-a', prompt_id: 'turn-a1' };
  processUserPromptSubmit(
    { ...a, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    a,
    'a-write-plan',
    {
      action: 'step',
      project_root: cwd,
      task: 't-handoff',
      step: 'write-plan',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'write-plan',
      intent: 'change',
    },
  );
  const b = { cwd, session_id: 'session-b', turn_id: 'turn-b1' };
  processUserPromptSubmit(
    { ...b, hook_event_name: 'UserPromptSubmit' },
    CODEX_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CODEX_WORKFLOW_ADAPTER,
    b,
    'b-execute',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'execute',
      intent: 'change',
    },
  );

  const actorA = actor('claude', 'session-a');
  const before = actorRaw(cwd, actorA);
  observeBash({
    cwd,
    session_id: 'session-b',
    turn_id: 'turn-b1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo OK' },
    tool_response: { stdout: 'OK', exit_code: 0 },
  });
  expect(ledger(cwd)).toContain('[x] G1');
  expect(actorRaw(cwd, actorA)).toBe(before);

  const nextA = processUserPromptSubmit(
    { ...a, prompt_id: 'turn-a2', hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  expect(nextA.hookSpecificOutput?.additionalContext).toBe(
    renderProgressLine('t-handoff', 'change', 'write-plan'),
  );
});

it('(c) a fresh session whose first call is a non-entry step gets no acknowledgment and no binding, staying silent at standard and falling back to the chain line at strict', () => {
  const cwd = fixture();
  const c = { cwd, session_id: 'session-c', prompt_id: 'turn-c1' };
  processUserPromptSubmit(
    { ...c, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  const rejected = runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    c,
    'c-implement',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'implement' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'implement',
      intent: 'change',
    },
  );
  expect(rejected).toEqual({ continue: true });
  expect(
    processUserPromptSubmit(
      { ...c, prompt_id: 'turn-c2', hook_event_name: 'UserPromptSubmit' },
      CLAUDE_WORKFLOW_ADAPTER,
    ),
  ).toEqual({ continue: true });

  writeConfig(cwd, 'project', { intervention: 'strict' });
  const strictTurn = processUserPromptSubmit(
    { ...c, prompt_id: 'turn-c3', hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  expect(strictTurn.hookSpecificOutput?.additionalContext).toBe(
    renderChainLine(),
  );
});

it('(d) that same fresh session then calling start creates a binding, and its next turn shows the progress line', () => {
  const cwd = fixture();
  const c = { cwd, session_id: 'session-c', prompt_id: 'turn-c1' };
  processUserPromptSubmit(
    { ...c, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    c,
    'c-implement',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'implement' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'implement',
      intent: 'change',
    },
  );
  const started = runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    c,
    'c-start',
    { action: 'start', project_root: cwd, task: 't-handoff', intent: 'change' },
    {
      status: 'accepted',
      action: 'start',
      task: 't-handoff',
      intent: 'change',
    },
  );
  expect(started.hookSpecificOutput?.additionalContext).toBe(
    renderCreatedAck('t-handoff', 'change'),
  );
  const nextC = processUserPromptSubmit(
    { ...c, prompt_id: 'turn-c2', hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  expect(nextC.hookSpecificOutput?.additionalContext).toBe(
    renderProgressLine('t-handoff', 'change'),
  );
});

it('(e) two actors bound to the same task each record a CHECK-matching Bash for a different gate into the shared ledger', () => {
  const cwd = fixture();
  const b = { cwd, session_id: 'session-b', turn_id: 'turn-b1' };
  processUserPromptSubmit(
    { ...b, hook_event_name: 'UserPromptSubmit' },
    CODEX_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CODEX_WORKFLOW_ADAPTER,
    b,
    'b-execute',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'execute',
      intent: 'change',
    },
  );
  const d = { cwd, session_id: 'session-d', prompt_id: 'turn-d1' };
  processUserPromptSubmit(
    { ...d, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    d,
    'd-execute',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'execute',
      intent: 'change',
    },
  );

  observeBash({
    cwd,
    session_id: 'session-b',
    turn_id: 'turn-b1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo OK' },
    tool_response: { stdout: 'OK', exit_code: 0 },
  });
  observeBash({
    cwd,
    session_id: 'session-d',
    prompt_id: 'turn-d1',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo OK2' },
    tool_response: { stdout: 'OK2', exit_code: 0 },
  });

  expect(ledger(cwd)).toContain('[x] G1');
  expect(ledger(cwd)).toContain('[x] G2');
});

it('(f) a designer entering a different task switches, naming the handoff task as the old one, without disturbing the implementer session bound to the handoff task', () => {
  const cwd = fixture();
  const a = { cwd, session_id: 'session-a', prompt_id: 'turn-a1' };
  processUserPromptSubmit(
    { ...a, hook_event_name: 'UserPromptSubmit' },
    CLAUDE_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    a,
    'a-write-plan',
    {
      action: 'step',
      project_root: cwd,
      task: 't-handoff',
      step: 'write-plan',
    },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'write-plan',
      intent: 'change',
    },
  );
  const b = { cwd, session_id: 'session-b', turn_id: 'turn-b1' };
  processUserPromptSubmit(
    { ...b, hook_event_name: 'UserPromptSubmit' },
    CODEX_WORKFLOW_ADAPTER,
  );
  runtimeCall(
    CODEX_WORKFLOW_ADAPTER,
    b,
    'b-execute',
    { action: 'step', project_root: cwd, task: 't-handoff', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-handoff',
      step: 'execute',
      intent: 'change',
    },
  );

  const switched = runtimeCall(
    CLAUDE_WORKFLOW_ADAPTER,
    a,
    'a-switch-to-other',
    { action: 'step', project_root: cwd, task: 't-other', step: 'execute' },
    {
      status: 'accepted',
      action: 'step',
      task: 't-other',
      step: 'execute',
      intent: 'change',
    },
  );
  expect(switched.hookSpecificOutput?.additionalContext).toBe(
    renderSwitchedAck('t-other', 't-handoff', 'change', 'execute'),
  );

  const actorB = actor('codex', 'session-b');
  expect(actorBinding(cwd, actorB)).toMatchObject({
    task: 't-handoff',
    state: 'active',
    step: 'execute',
  });
});

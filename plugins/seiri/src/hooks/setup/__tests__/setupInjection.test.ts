import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import { completeInvocation } from '../../../core/sessionSignals/workflow/completeInvocation.js';
import { observeBoundary } from '../../../core/sessionSignals/workflow/observeBoundary.js';
import { observeInvocation } from '../../../core/sessionSignals/workflow/observeInvocation.js';
import { readActorBinding } from '../../../core/sessionSignals/workflow/readActorBinding.js';
import { transitionWorkflow } from '../../../core/sessionSignals/workflow/transitionWorkflow.js';
import type { InterventionLevel } from '../../../types/config.js';
import type {
  WorkflowIdentity,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { renderProgressLine } from '../../shared/progressLine/renderProgressLine.js';
import { WORKFLOW_ADAPTER } from '../../shared/workflowAdapter.js';
import { workflowIdentity } from '../../shared/workflowHost/workflowIdentity.js';
import { processSessionStart } from '../setup.js';

const NOW = 1_700_000_000_000;

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

function seedRepo(intervention: InterventionLevel): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-setup-injection-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention });
  return cwd;
}

it.each(['off', 'advisory'] as const)(
  'injects nothing at %s',
  (intervention) => {
    expect(
      processSessionStart({
        cwd: seedRepo(intervention),
        session_id: 'session-a',
        prompt_id: 'turn-a',
        hook_event_name: 'SessionStart',
        source: 'startup',
      }),
    ).toEqual({ continue: true });
  },
);

it('carries the strict-only posture line at strict, absent at standard', () => {
  const strictContext = processSessionStart({
    cwd: seedRepo('strict'),
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(strictContext).toContain('Posture (strict)');

  const standardContext = processSessionStart({
    cwd: seedRepo('standard'),
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(standardContext).not.toContain('Posture');
});

it('appends the active binding’s progress line last at compact, and suspends it at resume', () => {
  const cwd = seedRepo('standard');
  const identity = workflowIdentity(
    { cwd, session_id: 'session-a', hook_event_name: 'SessionStart' },
    WORKFLOW_ADAPTER,
  )!;
  const entry: WorkflowIdentity = {
    ...identity,
    turn: 'entry-turn',
    call: 'entry-call',
  };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: cwd,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(entry, true, NOW);
  observeInvocation(entry, 'hash', NOW, request);
  completeInvocation(entry, 'hash', NOW, (s) => transitionWorkflow(s, request));

  const binding = readActorBinding(identity, NOW)!;
  const compactContext = processSessionStart(
    {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SessionStart',
      source: 'compact',
    },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(
    compactContext?.endsWith(
      renderProgressLine(binding.task, binding.intent, binding.step),
    ),
  ).toBe(true);

  const resumeContext = processSessionStart(
    {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SessionStart',
      source: 'resume',
    },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(resumeContext ?? '').not.toContain('task-a');
  expect(readActorBinding(identity, NOW)).toBeUndefined();

  const compactAfterResumeContext = processSessionStart(
    {
      cwd,
      session_id: 'session-a',
      hook_event_name: 'SessionStart',
      source: 'compact',
    },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(compactAfterResumeContext ?? '').not.toContain('task-a');
});
it('does not read the binding at a SessionStart with no source', () => {
  const cwd = seedRepo('standard');
  const identity = workflowIdentity(
    { cwd, session_id: 'session-b', hook_event_name: 'SessionStart' },
    WORKFLOW_ADAPTER,
  )!;
  const entry: WorkflowIdentity = {
    ...identity,
    turn: 'entry-turn',
    call: 'entry-call',
  };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: cwd,
    task: 'task-b',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(entry, true, NOW);
  observeInvocation(entry, 'hash', NOW, request);
  completeInvocation(entry, 'hash', NOW, (s) => transitionWorkflow(s, request));
  expect(readActorBinding(identity, NOW)?.task).toBe('task-b');

  const context = processSessionStart(
    { cwd, session_id: 'session-b', hook_event_name: 'SessionStart' },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(context ?? '').not.toContain('task-b');
});

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableDirname, portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it, vi } from 'vitest';

import * as directiveStore from '../../../core/directives/utils/readDirectiveBindings.js';
import { updateDirectiveBinding } from '../../../core/directives/utils/updateDirectiveBinding.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import * as ruleStatusStore from '../../../core/ruleDocs/status/buildRuleDocsStatus.js';
import { completeInvocation } from '../../../core/sessionSignals/workflow/completeInvocation.js';
import { observeBoundary } from '../../../core/sessionSignals/workflow/observeBoundary.js';
import { observeInvocation } from '../../../core/sessionSignals/workflow/observeInvocation.js';
import { readActorBinding } from '../../../core/sessionSignals/workflow/readActorBinding.js';
import { transitionWorkflow } from '../../../core/sessionSignals/workflow/transitionWorkflow.js';
import type { InterventionLevel } from '../../../types/config.js';
import type { DirectiveScope } from '../../../types/directives.js';
import type { SessionStartInput } from '../../../types/hooks.js';
import type {
  WorkflowIdentity,
  WorkflowRequest,
} from '../../../types/workflow.js';
import { renderProgressLine } from '../../shared/progressLine/renderProgressLine.js';
import { WORKFLOW_ADAPTER } from '../../shared/workflowAdapter.js';
import { CODEX_WORKFLOW_ADAPTER } from '../../shared/workflowAdapters/codex.js';
import { workflowIdentity } from '../../shared/workflowHost/workflowIdentity.js';
import { processSessionStart } from '../setup.js';

const NOW = 1_700_000_000_000;

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
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
  expect(strictContext).toContain('Posture[strict]');
  expect(strictContext).toContain('Election[strict]');
  expect(strictContext).toContain('however small');
  expect(strictContext).toContain('must enter seiri:write-plan');

  const standardContext = processSessionStart({
    cwd: seedRepo('standard'),
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(standardContext).not.toContain('Posture');
  expect(standardContext).not.toContain('however small');
  expect(standardContext).not.toContain('must enter seiri:write-plan');
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

/** Build a native compaction event for the main actor of a temporary checkout. */
function compactInput(cwd: string): SessionStartInput {
  return {
    cwd,
    session_id: 'session-a',
    hook_event_name: 'SessionStart',
    source: 'compact',
  };
}

/** Register a local set for the given native session or its checkout. */
function seedDirectives(
  input: SessionStartInput,
  scope: DirectiveScope,
  set = 'focus',
  content = 'Keep the investigation focused.',
  adapter = WORKFLOW_ADAPTER,
): string {
  const identity = workflowIdentity(input, adapter)!;
  const directory = portableJoin(identity.root, '.seiri', 'directives', set);
  mkdirSync(directory, { recursive: true });
  const file = portableJoin(directory, 'focus.md');
  writeFileSync(file, content);
  updateDirectiveBinding(identity.root, set, () => ({
    enabled: true,
    root: identity.root,
    scope,
    ...(scope === 'session' ? { actor: identity.actor } : {}),
    boundAt: NOW - 1,
  }));
  return file;
}

/** Seed an active workflow so the test can verify progress placement. */
function seedProgress(input: SessionStartInput): void {
  const entry: WorkflowIdentity = {
    ...workflowIdentity(input, WORKFLOW_ADAPTER)!,
    turn: 'entry-turn',
    call: 'entry-call',
  };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: input.cwd,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(entry, true, NOW);
  observeInvocation(entry, 'hash', NOW, request);
  completeInvocation(entry, 'hash', NOW, (state) =>
    transitionWorkflow(state, request),
  );
}

it('puts the directives after the rule summary and before the final progress line', () => {
  const input = compactInput(seedRepo('standard'));
  vi.stubEnv('CLAUDE_PLUGIN_ROOT', input.cwd);
  vi.spyOn(ruleStatusStore, 'buildRuleDocsStatus').mockReturnValue([
    {
      id: 'naming',
      title: 'Naming',
      filename: 'naming.md',
      description: '',
      recommended: true,
      target: '',
      displayTarget: '',
      source: 'current',
      deployed: true,
      active: true,
      activeTarget: '',
      activeDisplayTarget: '',
      activeDeployedHash: 'hash',
      activeInSync: true,
      activeSource: 'current',
      templateHash: 'hash',
      deployedHash: 'hash',
      inSync: true,
    },
  ]);
  seedProgress(input);
  seedDirectives(input, 'session');
  const context =
    processSessionStart(input, WORKFLOW_ADAPTER, NOW).hookSpecificOutput
      ?.additionalContext ?? '';
  expect(context).toMatch(
    /Active rules:[\s\S]*Directives focus[\s\S]*Keep the investigation focused\./,
  );
  expect(
    context.endsWith(renderProgressLine('task-a', 'change', 'write-plan')),
  ).toBe(true);
  const root = workflowIdentity(input, WORKFLOW_ADAPTER)!.root;
  expect(directiveStore.readDirectiveBindings(root).focus?.lastInjectedAt).toBe(
    NOW,
  );
});

it('keeps compact silent at off even with a bound session', () => {
  const input = compactInput(seedRepo('off'));
  seedDirectives(input, 'session');
  expect(processSessionStart(input, WORKFLOW_ADAPTER, NOW)).toEqual({
    continue: true,
  });
});

it('keeps session-scoped directives out of another session', () => {
  const input = compactInput(seedRepo('standard'));
  seedDirectives(input, 'session');
  const context = processSessionStart(
    { ...input, session_id: 'other' },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(context).not.toContain('Directives focus');
});

it('shares all-scoped directives with every main session in the checkout', () => {
  const input = compactInput(seedRepo('strict'));
  seedDirectives(input, 'all');
  const context = processSessionStart(
    { ...input, session_id: 'other' },
    WORKFLOW_ADAPTER,
    NOW,
  ).hookSpecificOutput?.additionalContext;
  expect(context).toContain('Keep the investigation focused.');
});

it.each([{ agent_id: 'child' }, { source: 'startup' }, { source: 'resume' }])(
  'omits directives outside main-actor compaction (%j)',
  (changes) => {
    const input = compactInput(seedRepo('standard'));
    seedDirectives(input, 'all');
    const context = processSessionStart(
      { ...input, ...changes },
      WORKFLOW_ADAPTER,
      NOW,
    ).hookSpecificOutput?.additionalContext;
    expect(context).not.toContain('Directives focus');
  },
);

it('preserves election and progress when the directive store throws', () => {
  const input = compactInput(seedRepo('standard'));
  seedProgress(input);
  seedDirectives(input, 'session');
  const read = vi
    .spyOn(directiveStore, 'readDirectiveBindings')
    .mockImplementation(() => {
      throw new Error('Directive storage is inaccessible');
    });
  const context =
    processSessionStart(input, WORKFLOW_ADAPTER, NOW).hookSpecificOutput
      ?.additionalContext ?? '';
  expect(read).toHaveBeenCalled();
  expect(context).not.toContain('Directives focus');
  expect(context).toContain('[seiri] Election:');
  expect(
    context.endsWith(renderProgressLine('task-a', 'change', 'write-plan')),
  ).toBe(true);
});

it('uses pointers when two sets together exceed the Codex byte limit', () => {
  const input = compactInput(seedRepo('standard'));
  const first = seedDirectives(
    input,
    'session',
    'first',
    '한'.repeat(700),
    CODEX_WORKFLOW_ADAPTER,
  );
  const second = seedDirectives(
    input,
    'session',
    'second',
    '글'.repeat(700),
    CODEX_WORKFLOW_ADAPTER,
  );
  const context =
    processSessionStart(input, CODEX_WORKFLOW_ADAPTER, NOW).hookSpecificOutput
      ?.additionalContext ?? '';
  expect(context.split('\n')).toContain(portableDirname(first));
  expect(context.split('\n')).toContain(portableDirname(second));
  expect(context).not.toContain(first);
  expect(context).not.toContain(second);
  expect(context).toMatch(/read.*except binding\.json before continuing/i);
  expect(Buffer.byteLength(context)).toBeLessThanOrEqual(4000);
  expect(context).not.toMatch(/[한글]/);
});

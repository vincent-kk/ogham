import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it, vi } from 'vitest';

import { updateDirectiveBinding } from '../../../core/directives/utils/updateDirectiveBinding.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import * as ruleStatusStore from '../../../core/ruleDocs/status/buildRuleDocsStatus.js';
import { completeInvocation } from '../../../core/sessionSignals/workflow/completeInvocation.js';
import { observeBoundary } from '../../../core/sessionSignals/workflow/observeBoundary.js';
import { observeInvocation } from '../../../core/sessionSignals/workflow/observeInvocation.js';
import { transitionWorkflow } from '../../../core/sessionSignals/workflow/transitionWorkflow.js';
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
const INDEX_BODY = `${'한'.repeat(1333)}a`;

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }));
});

/** Seed a strict checkout with a structured set, drifted rule and active progress. */
function seedStructured(adapter: typeof WORKFLOW_ADAPTER): {
  input: SessionStartInput;
  directory: string;
} {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-structured-inject-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention: 'strict' });
  const input: SessionStartInput = {
    cwd,
    session_id: 'session-a',
    hook_event_name: 'SessionStart',
    source: 'compact',
  };
  const identity = workflowIdentity(input, adapter)!;
  const directory = portableJoin(identity.root, '.seiri', 'directives', 'flow');
  mkdirSync(directory, { recursive: true });
  writeFileSync(portableJoin(directory, 'index.md'), INDEX_BODY);
  writeFileSync(portableJoin(directory, 'principles.md'), 'principle body');
  updateDirectiveBinding(identity.root, 'flow', () => ({
    enabled: true,
    root: identity.root,
    scope: 'session',
    actor: identity.actor,
    boundAt: NOW - 1,
  }));
  vi.stubEnv('CLAUDE_PLUGIN_ROOT', cwd);
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
      activeInSync: false,
      activeSource: 'current',
      templateHash: 'hash',
      deployedHash: 'hash',
      inSync: true,
    },
  ]);
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
  completeInvocation(entry, 'hash', NOW, (state) =>
    transitionWorkflow(state, request),
  );
  return { input, directory };
}

it.each([
  ['claude', WORKFLOW_ADAPTER, 9000, (text: string) => text.length],
  ['codex', CODEX_WORKFLOW_ADAPTER, 9000, Buffer.byteLength],
] as const)(
  'injects a 4000-byte entry document on %s beside every fixed line',
  (_host, adapter, limit, measure) => {
    expect(Buffer.byteLength(INDEX_BODY)).toBe(4000);
    const { input } = seedStructured(adapter);
    const context =
      processSessionStart(input, adapter, NOW).hookSpecificOutput
        ?.additionalContext ?? '';
    expect(context).toContain('Posture[strict]');
    expect(context).toContain('Active rules:');
    expect(context).toContain('differ from the shipped template');
    expect(context).toContain(INDEX_BODY);
    expect(context).toContain(
      'Read principles.md in that directory before continuing.',
    );
    expect(context).not.toContain('principle body');
    expect(
      context.endsWith(renderProgressLine('task-a', 'change', 'write-plan')),
    ).toBe(true);
    expect(measure(context)).toBeLessThanOrEqual(limit);
  },
);

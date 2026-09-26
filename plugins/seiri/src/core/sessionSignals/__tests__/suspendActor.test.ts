import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type { WorkflowRequest } from '../../../types/workflow.js';
import { completeInvocation } from '../workflow/completeInvocation.js';
import { observeBoundary } from '../workflow/observeBoundary.js';
import { observeInvocation } from '../workflow/observeInvocation.js';
import { suspendActor } from '../workflow/suspendActor.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
/** An actor with an active binding, ready for either suspend path. */
function fixture() {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-suspend-actor-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id = { root, actor: 'actor', turn: 'turn', call: 'call' };
  const request: WorkflowRequest = {
    action: 'step',
    project_root: root,
    task: 'task-a',
    step: 'write-plan',
    intent: 'change',
  };
  observeBoundary(id, true, NOW);
  observeInvocation(id, 'hash', NOW, request);
  completeInvocation(id, 'hash', NOW, (s) => transitionWorkflow(s, request));
  return { id, path: portableJoin(root, '.seiri/sessions/actor.json') };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('suspendActor and observeBoundary(..., false, now, { suspend: true }) leave identical state', () => {
  const a = fixture();
  const b = fixture();

  const viaSuspendActor = suspendActor(a.id, NOW);
  const viaObserveBoundary = observeBoundary(b.id, false, NOW, {
    suspend: true,
  });

  expect(viaSuspendActor).toEqual(viaObserveBoundary);
  expect(readFileSync(a.path, 'utf8')).toBe(readFileSync(b.path, 'utf8'));
});

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

import { completeInvocation } from '../workflow/completeInvocation.js';
import { observeBoundary } from '../workflow/observeBoundary.js';
import { observeInvocation } from '../workflow/observeInvocation.js';
import { transitionWorkflow } from '../workflow/transitionWorkflow.js';

const NOW = 1_700_000_000_000;
const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-corrupt-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  const id = { root, actor: 'actor', turn: 'turn', call: 'start' };
  const request = {
    action: 'start',
    task: 'task',
    intent: 'change',
    project_root: root,
  } as const;
  observeBoundary(id, true, NOW);
  observeInvocation(id, 'hash', NOW, request);
  completeInvocation(id, 'hash', NOW, (s) => transitionWorkflow(s, request));
  const bash = { ...id, call: 'bash' };
  observeInvocation(bash, 'command', NOW);
  return { id: bash, path: portableJoin(root, '.seiri/sessions/actor.json') };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it.each(['startedAt', 'kind', 'turn'])(
  'rejects an invocation with missing %s',
  (field) => {
    const { id, path } = fixture();
    const state = JSON.parse(readFileSync(path, 'utf8'));
    delete state.invocations.bash[field];
    writeFileSync(path, JSON.stringify(state));
    expect(
      completeInvocation(id, 'command', NOW, () => 'effect'),
    ).toBeUndefined();
  },
);
it.each(['intent', 'counts', 'verdicts'])(
  'rejects a binding with corrupted %s',
  (field) => {
    const { id, path } = fixture();
    const state = JSON.parse(readFileSync(path, 'utf8'));
    state.binding[field] = [];
    writeFileSync(path, JSON.stringify(state));
    expect(
      completeInvocation(id, 'command', NOW, () => 'effect'),
    ).toBeUndefined();
  },
);

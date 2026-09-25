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

import {
  completeInvocation,
  observeBoundary,
  observeInvocation,
  transitionWorkflow,
} from '../workflow/transitions.js';

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
  observeBoundary(id, true);
  observeInvocation(id, 'hash', request);
  completeInvocation(id, 'hash', (s) => transitionWorkflow(s, request));
  const bash = { ...id, call: 'bash' };
  observeInvocation(bash, 'command');
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
    expect(completeInvocation(id, 'command', () => 'effect')).toBeUndefined();
  },
);
it.each(['intent', 'counts', 'verdicts'])(
  'rejects a binding with corrupted %s',
  (field) => {
    const { id, path } = fixture();
    const state = JSON.parse(readFileSync(path, 'utf8'));
    state.binding[field] = [];
    writeFileSync(path, JSON.stringify(state));
    expect(completeInvocation(id, 'command', () => 'effect')).toBeUndefined();
  },
);

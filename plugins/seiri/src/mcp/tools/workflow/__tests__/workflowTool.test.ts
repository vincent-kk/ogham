import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import type { WorkflowRequest } from '../../../../types/workflow.js';
import { handleWorkflow } from '../workflow.js';

const roots: string[] = [];
function fixture(level = 'standard'): WorkflowRequest {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-tool-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  mkdirSync(portableJoin(root, '.seiri'));
  writeFileSync(
    portableJoin(root, '.seiri/config.json'),
    JSON.stringify({ intervention: level }),
  );
  return {
    action: 'start',
    task: 'test-task',
    project_root: root,
    intent: 'change',
  };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
it('accepts a request without creating an actor state or ledger', () => {
  const input = fixture();
  expect(handleWorkflow(input)).toEqual({
    status: 'accepted',
    action: 'start',
    task: 'test-task',
    intent: 'change',
  });
  expect(existsSync(portableJoin(input.project_root, '.seiri/sessions'))).toBe(
    false,
  );
  expect(existsSync(portableJoin(input.project_root, '.seiri/tasks'))).toBe(
    false,
  );
});
it.each(['off', 'advisory'] as const)('reports disabled at %s with its reason', (level) => {
  expect(handleWorkflow(fixture(level))).toEqual({
    status: 'disabled',
    reason: level,
  });
});
it('rejects relative paths, traversal task names, unknown actions and missing start intent', () => {
  const valid = fixture();
  for (const invalid of [
    { project_root: '.' },
    { task: '../escape' },
    { action: 'activate' },
    { intent: undefined },
  ])
    expect(() =>
      handleWorkflow({ ...valid, ...invalid } as WorkflowRequest),
    ).toThrow();
});
it('accepts pause and finish without an intent', () => {
  const input = fixture();
  expect(
    handleWorkflow({ ...input, action: 'pause', intent: undefined }).status,
  ).toBe('accepted');
  expect(
    handleWorkflow({ ...input, action: 'finish', intent: undefined }).status,
  ).toBe('accepted');
});

import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { toCheckOutcome } from '../postToolUse/utils/toCheckOutcome.js';
import { CODEX_WORKFLOW_ADAPTER } from '../shared/workflowAdapters/codex.js';
import { workflowRequest } from '../shared/workflowHost/workflowRequest.js';

const roots: string[] = [];
function fixture() {
  const parent = mkdtempSync(portableJoin(tmpdir(), 'seiri-path-'));
  roots.push(parent);
  const root = portableJoin(parent, 'repo');
  mkdirSync(root);
  mkdirSync(portableJoin(root, '.git'));
  return { parent, root };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
it.each(['/', '/.'])(
  'normalizes a legitimate workspace suffix %s',
  (suffix) => {
    const { root } = fixture();
    expect(
      workflowRequest(
        'mcp__seiri__runtime',
        {
          action: 'start',
          task: 'task',
          intent: 'change',
          project_root: root + suffix,
        },
        root,
        CODEX_WORKFLOW_ADAPTER,
      ),
    ).toBeDefined();
  },
);
it('recognizes a workspace symlink without accepting an unrelated repository', () => {
  const { parent, root } = fixture();
  const alias = portableJoin(parent, 'alias');
  symlinkSync(root, alias, 'junction');
  const request = {
    action: 'start',
    task: 'task',
    intent: 'change',
    project_root: alias,
  };
  expect(
    workflowRequest(
      'mcp__seiri__runtime',
      request,
      root,
      CODEX_WORKFLOW_ADAPTER,
    ),
  ).toBeDefined();
  expect(
    workflowRequest(
      'mcp__seiri__runtime',
      { ...request, project_root: parent },
      root,
      CODEX_WORKFLOW_ADAPTER,
    ),
  ).toBeUndefined();
});
it('resolves a symlink into a repository subdirectory before locating its root', () => {
  const { parent, root } = fixture();
  const sub = portableJoin(root, 'sub');
  mkdirSync(sub);
  const alias = portableJoin(parent, 'nested-alias');
  symlinkSync(sub, alias, 'junction');
  expect(
    workflowRequest(
      'mcp__seiri__runtime',
      { action: 'start', task: 'task', intent: 'change', project_root: alias },
      root,
      CODEX_WORKFLOW_ADAPTER,
    ),
  ).toBeDefined();
});
it('excludes dial from the paired lifecycle whitelist', () => {
  const { root } = fixture();
  expect(
    workflowRequest(
      'mcp__seiri__runtime',
      {
        action: 'dial',
        task: 'task',
        intent: 'change',
        project_root: root,
        dial_op: 'get',
      },
      root,
      CODEX_WORKFLOW_ADAPTER,
    ),
  ).toBeUndefined();
});
it('treats Claude interrupted successful-tool envelopes as interruptions', () => {
  expect(
    toCheckOutcome({
      cwd: '/repo',
      session_id: 'session',
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_response: { stdout: 'OK', interrupted: true },
    }).interrupted,
  ).toBe(true);
});

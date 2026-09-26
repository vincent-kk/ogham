import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { workflowIdentity } from '../workflowIdentity.js';
import { workflowMainIdentity } from '../workflowMainIdentity.js';

const roots: string[] = [];
function cwd(): string {
  const dir = mkdtempSync(portableJoin(tmpdir(), 'seiri-main-identity-'));
  roots.push(dir);
  mkdirSync(portableJoin(dir, '.git'));
  return dir;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

it("a child identity's main identity equals the identity computed with no agent_id", () => {
  const root = cwd();
  const childInput = {
    cwd: root,
    session_id: 'session-a',
    hook_event_name: 'SubagentStart',
    prompt_id: 'turn-a',
    agent_id: 'child-1',
  };
  const expected = workflowIdentity({ ...childInput, agent_id: undefined });
  expect(workflowMainIdentity(childInput)).toEqual(expected);
  expect(workflowMainIdentity(childInput)?.actor).not.toBe(
    workflowIdentity(childInput)?.actor,
  );
});
it('resolves the same main identity for a payload that already has no agent_id', () => {
  const root = cwd();
  const mainInput = {
    cwd: root,
    session_id: 'session-a',
    hook_event_name: 'UserPromptSubmit',
    prompt_id: 'turn-a',
  };
  expect(workflowMainIdentity(mainInput)).toEqual(workflowIdentity(mainInput));
});

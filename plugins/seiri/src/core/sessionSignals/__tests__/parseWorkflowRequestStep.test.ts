import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { WORKFLOW_SKILLS } from '../../../constants/workflowChain.js';
import { parseWorkflowRequest } from '../workflow/parseWorkflowRequest.js';

const roots: string[] = [];
function root(): string {
  const dir = mkdtempSync(portableJoin(tmpdir(), 'seiri-parse-step-'));
  roots.push(dir);
  return dir;
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

const REVIEW_STEPS = ['review-plan', 'request-review', 'receive-review'];

it.each(WORKFLOW_SKILLS)('derives intent for step %s when omitted', (step) => {
  const request = parseWorkflowRequest({
    action: 'step',
    project_root: root(),
    task: 'task-a',
    step,
  });
  expect(request?.intent).toBe(
    REVIEW_STEPS.includes(step) ? 'review' : 'change',
  );
});
it('an explicit intent on a step request wins over the derived one', () => {
  const request = parseWorkflowRequest({
    action: 'step',
    project_root: root(),
    task: 'task-a',
    step: 'review-plan',
    intent: 'change',
  });
  expect(request?.intent).toBe('change');
});
it('rejects a step request naming a value outside WorkflowStep', () => {
  expect(
    parseWorkflowRequest({
      action: 'step',
      project_root: root(),
      task: 'task-a',
      step: 'not-a-skill',
    }),
  ).toBeUndefined();
});
it('rejects a step request with no step at all', () => {
  expect(
    parseWorkflowRequest({
      action: 'step',
      project_root: root(),
      task: 'task-a',
    }),
  ).toBeUndefined();
});
it('does not whitelist the dial action', () => {
  expect(
    parseWorkflowRequest({
      action: 'dial',
      project_root: root(),
      task: 'task-a',
    }),
  ).toBeUndefined();
});
it('still requires intent for start and resume', () => {
  expect(
    parseWorkflowRequest({
      action: 'start',
      project_root: root(),
      task: 'task-a',
    }),
  ).toBeUndefined();
  expect(
    parseWorkflowRequest({
      action: 'resume',
      project_root: root(),
      task: 'task-a',
    }),
  ).toBeUndefined();
});

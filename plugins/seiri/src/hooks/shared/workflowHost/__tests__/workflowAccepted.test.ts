import { expect, it } from 'vitest';

import type { WorkflowRequest } from '../../../../types/workflow.js';
import { workflowAccepted } from '../workflowAccepted.js';

const request: WorkflowRequest = {
  action: 'step',
  project_root: '/repo',
  task: 'task-a',
  step: 'write-plan',
  intent: 'change',
};
function content(overrides: Record<string, unknown> = {}) {
  return [
    {
      type: 'text',
      text: JSON.stringify({
        status: 'accepted',
        action: request.action,
        task: request.task,
        step: request.step,
        intent: request.intent,
        ...overrides,
      }),
    },
  ];
}

it('accepts a reply whose step matches the request', () => {
  expect(workflowAccepted(content(), request)).toBe(true);
});
it('rejects a reply naming a different step than the request', () => {
  expect(workflowAccepted(content({ step: 'execute' }), request)).toBe(false);
});
it('rejects a reply with no step when the request named one', () => {
  expect(workflowAccepted(content({ step: undefined }), request)).toBe(false);
});

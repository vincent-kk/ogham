import { describe, expect, it } from 'vitest';

import { renderChainLine } from '../renderChainLine.js';
import { renderCreatedAck } from '../renderCreatedAck.js';
import { renderMismatchNotice } from '../renderMismatchNotice.js';
import { renderProgressLine } from '../renderProgressLine.js';
import { renderSubagentLine } from '../renderSubagentLine.js';
import { renderSwitchedAck } from '../renderSwitchedAck.js';

describe('progressLine renderers', () => {
  it('renders the plain chain with no phrase when no step is recorded', () => {
    expect(renderProgressLine('payment-refactor', 'change')).toBe(
      '[seiri] payment-refactor (change): write-plan → review-plan → execute → implement → verify → request-review',
    );
  });

  it('brackets an on-chain step and appends its phrase', () => {
    expect(renderProgressLine('payment-refactor', 'change', 'implement')).toBe(
      '[seiri] payment-refactor (change): write-plan → review-plan → execute → [implement] → verify → request-review — implementing a unit; seiri:verify decides whether it works',
    );
  });

  it('appends an off-chain step after the unbracketed main chain', () => {
    const line = renderProgressLine(
      'payment-refactor',
      'change',
      'trace-cause',
    );
    expect(line).toContain(
      'write-plan → review-plan → execute → implement → verify → request-review · now: [trace-cause]',
    );
    expect(line).toContain(
      'tracing a failure; the fix still owes seiri:verify',
    );
  });

  it('renders the created acknowledgment in progress-line shape', () => {
    expect(renderCreatedAck('payment-refactor', 'change', 'write-plan')).toBe(
      '[seiri] Workflow payment-refactor started (change): [write-plan] → review-plan → execute → implement → verify → request-review — planning; seiri:review-plan checks the plan before seiri:execute',
    );
  });

  it('names the old task in the switched acknowledgment', () => {
    expect(
      renderSwitchedAck('payment-refactor', 'old-task', 'change', 'execute'),
    ).toContain('Workflow payment-refactor switched from old-task (change):');
  });

  it('names the requested and bound tasks in the mismatch notice', () => {
    expect(renderMismatchNotice('task-b', 'task-a')).toBe(
      '[seiri] Workflow task-b: not applied; task-a is bound — finish it, or enter task-b via write-plan/execute.',
    );
  });

  it('marks the subagent line as starting no chain of its own', () => {
    expect(renderSubagentLine('payment-refactor', 'change')).toContain(
      'this subagent works inside the current step and starts no chain of its own.',
    );
  });

  it('renders the fixed chain line', () => {
    expect(renderChainLine()).toContain('Workflow: seiri:write-plan');
  });
});

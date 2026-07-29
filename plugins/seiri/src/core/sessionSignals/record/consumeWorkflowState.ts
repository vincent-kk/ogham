import type { WorkflowSkill } from '../../../constants/workflowChain.js';
import { readSignals } from '../store/readSignals.js';
import { withSignalsLock } from '../store/withSignalsLock.js';
import { writeSignals } from '../store/writeSignals.js';

/**
 * Take the workflow state a turn has not been told about yet, marking it
 * told. Returns the skill once per load, `undefined` every time after.
 *
 * Consuming rather than reading is what keeps the clause a hand-off note:
 * a state repeated every turn until the chain moves would be a banner, and
 * a banner is what gets tuned out.
 */
export function consumeWorkflowState(
  projectRoot: string,
  sessionId: string,
): WorkflowSkill | undefined {
  return withSignalsLock(projectRoot, () => {
    const signals = readSignals(projectRoot, sessionId);
    const pending = signals.workflow;
    if (pending === undefined || pending.announced) return undefined;

    signals.workflow = { ...pending, announced: true };
    writeSignals(projectRoot, signals);
    return pending.skill;
  });
}

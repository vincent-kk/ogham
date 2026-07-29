import { SKILL_ID_PREFIX } from '../../../constants/plugin.js';
import { WORKFLOW_SKILLS } from '../../../constants/workflowChain.js';
import type { WorkflowSkill } from '../../../constants/workflowChain.js';
import { readSignals } from '../store/readSignals.js';
import { withSignalsLock } from '../store/withSignalsLock.js';
import { writeSignals } from '../store/writeSignals.js';

/**
 * Remember which seiri workflow this session just loaded, and answer
 * whether anything was remembered.
 *
 * Only workflows with a hand-off clause are kept. Another plugin's skill,
 * or a user-invoked gate like `seiri:setup`, leaves no state a next moment
 * could be handed — and a state nobody can hand off from is not a chain.
 *
 * Each load re-arms the state: loading a workflow a second time is a
 * second moment, and the turn after it deserves the same one mention.
 */
export function recordWorkflowState(
  projectRoot: string,
  sessionId: string,
  skillId: unknown,
): boolean {
  const skill = chainMember(skillId);
  if (skill === undefined) return false;

  return withSignalsLock(projectRoot, () => {
    const signals = readSignals(projectRoot, sessionId);
    signals.workflow = { skill, announced: false };
    writeSignals(projectRoot, signals);
    return true;
  });
}

function chainMember(skillId: unknown): WorkflowSkill | undefined {
  if (typeof skillId !== 'string' || !skillId.startsWith(SKILL_ID_PREFIX))
    return undefined;

  const skill = skillId.slice(SKILL_ID_PREFIX.length);
  return (WORKFLOW_SKILLS as readonly string[]).includes(skill)
    ? (skill as WorkflowSkill)
    : undefined;
}

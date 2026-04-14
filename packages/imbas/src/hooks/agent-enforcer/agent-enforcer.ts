import { AGENT_CONSTRAINTS, AGENT_NAME_PREFIX } from '../../constants/index.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';

export function processAgentEnforcer(input: SubagentStartInput): HookOutput {
  // Inject imbas-specific constraints for imbas agents
  const { agent_name } = input;

  if (!agent_name) {
    return { continue: true };
  }

  // Identify if this is an imbas agent:
  // either via prefix or by existence in the constraints map
  const isImbasAgent = AGENT_NAME_PREFIX
    ? agent_name.startsWith(AGENT_NAME_PREFIX)
    : Object.prototype.hasOwnProperty.call(AGENT_CONSTRAINTS, agent_name);

  if (!isImbasAgent) {
    return { continue: true };
  }

  const constraint = AGENT_CONSTRAINTS[agent_name];
  if (!constraint) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: constraint,
    },
  };
}

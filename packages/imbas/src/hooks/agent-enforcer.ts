import { AGENT_NAME_PREFIX, AGENT_CONSTRAINTS } from '../constants/index.js';
import type { HookOutput, SubagentStartInput } from '../types/hooks.js';

export function processAgentEnforcer(input: SubagentStartInput): HookOutput {
  // Inject imbas-specific constraints for imbas agents
  const { agent_name } = input;

  if (!agent_name?.startsWith(AGENT_NAME_PREFIX)) {
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

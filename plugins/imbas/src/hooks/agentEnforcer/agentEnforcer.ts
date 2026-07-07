import { AGENT_CONSTRAINTS } from '../../constants/pipeline.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';

export function processAgentEnforcer(input: SubagentStartInput): HookOutput {
  const { agent_name } = input;

  if (!agent_name) return { continue: true };

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

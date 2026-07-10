import { AGENT_CONSTRAINTS } from '../../constants/pipeline.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';

export function processAgentEnforcer(input: SubagentStartInput): HookOutput {
  // Plugin-namespaced spawns ("imbas:engineer") must hit the same
  // constraint keys as bare names — AGENT_CONSTRAINTS is keyed bare.
  const agentType = (input.agent_type ?? '').replace(/^imbas:/, '');

  if (!agentType) return { continue: true };

  const constraint = AGENT_CONSTRAINTS[agentType];
  if (!constraint) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: constraint,
    },
  };
}

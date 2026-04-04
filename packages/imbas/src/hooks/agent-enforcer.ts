import type { HookOutput, SubagentStartInput } from '../types/hooks.js';

export function processAgentEnforcer(input: SubagentStartInput): HookOutput {
  // Inject imbas-specific constraints for imbas agents
  const { agent_name } = input;

  if (!agent_name?.startsWith('imbas-')) {
    return { continue: true };
  }

  const constraints: Record<string, string> = {
    'imbas-analyst':
      '[imbas:analyst] Read-only analysis mode. Do NOT create or modify Jira issues. Return structured validation report only.',
    'imbas-planner':
      '[imbas:planner] Plan-then-Execute mode. Generate stories-manifest.json only — do NOT create Jira issues directly. All Jira writes go through /imbas:manifest.',
    'imbas-engineer':
      '[imbas:engineer] Code exploration mode. Generate devplan-manifest.json only — do NOT modify source code or create Jira issues directly.',
    'imbas-media':
      '[imbas:media] Media analysis mode. Read frame images, write analysis.json to .imbas/.temp/ only.',
  };

  const constraint = constraints[agent_name];
  if (!constraint) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SubagentStart',
      additionalContext: constraint,
    },
  };
}

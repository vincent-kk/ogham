import { loadConfig, resolveLanguage } from '../../core/infra/config-loader/config-loader.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import {
  ROLE_RESTRICTIONS,
  PLANNING_GUIDANCE,
  IMPLEMENTATION_REMINDER,
  PLANNING_AGENT_RE,
  EXECUTOR_AGENT_RE,
} from '../../constants/agent-context.js';

import { isFcaProject } from '../shared/shared.js';
import { validateCwd } from '../utils/validate-cwd.js';

/** Resolve [filid:lang] tag for injection into agent context. */
function buildLangTag(cwd: string): string {
  try {
    const config = loadConfig(cwd);
    return `[filid:lang] ${resolveLanguage(config)}`;
  } catch {
    return '[filid:lang] en';
  }
}

/**
 * SubagentStart hook: inject role-based tool restrictions and FCA-AI workflow guidance.
 *
 * Priority order:
 * 1. filid agent role restrictions (exact match, always applied)
 * 2. FCA project check (skip non-FCA projects for workflow guidance)
 * 3. Planning agent guidance (OMC planner/architect/analyst/critic, native Plan)
 * 4. Implementation agent reminder (OMC executor/deep-executor, native general-purpose)
 */
export function enforceAgentRole(input: SubagentStartInput): HookOutput {
  const agentType = input.agent_type ?? '';

  // Security: validate payload cwd before any fs / execSync usage downstream.
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) {
    return { continue: true };
  }

  // 1. filid agent role restrictions + language tag
  const restriction = ROLE_RESTRICTIONS[agentType];
  if (restriction) {
    const langTag = buildLangTag(safeCwd);
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `${restriction}\n${langTag}`,
      },
    };
  }

  // 2. Skip workflow guidance for non-FCA projects
  if (!isFcaProject(safeCwd)) {
    return { continue: true };
  }

  // 3. Planning agents: inject development workflow + language tag
  const langTag = buildLangTag(safeCwd);
  if (PLANNING_AGENT_RE.test(agentType) || agentType === 'Plan') {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `${PLANNING_GUIDANCE}\n${langTag}`,
      },
    };
  }

  // 4. Implementation agents: inject pre-implementation reminder + language tag
  if (EXECUTOR_AGENT_RE.test(agentType) || agentType === 'general-purpose') {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: `${IMPLEMENTATION_REMINDER}\n${langTag}`,
      },
    };
  }

  return { continue: true };
}

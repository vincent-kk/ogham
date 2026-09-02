import { ENV_PLUGIN_ROOT } from '../../constants/env.js';
import { HookEvent } from '../../constants/hooks.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { getRuleDocsStatus } from '../../core/ruleDocs/status/getRuleDocsStatus.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';
import { renderStatusLines } from '../shared/renderStatusLines.js';

/**
 * SubagentStart: tell a subagent which rules this repository turned on.
 *
 * A subagent does not inherit the parent's SessionStart context, so
 * without this it works with no idea that the project opted into anything
 * — and the official guidance for that gap is to restate the needed rules
 * in the delegating prompt, which only covers delegations a skill wrote.
 *
 * It restates *which* rules, never *what they say*. The files are under
 * `.claude/rules/` and a subagent can read them; copying their text into
 * every spawn would be the same double spend the SessionStart render
 * exists to avoid, multiplied by the number of subagents.
 */
export function processSubagentStart(input: SubagentStartInput): HookOutput {
  if (!input.cwd) return EMPTY_RESULT;

  const intervention = loadHookIntervention(input.cwd);
  if (intervention === undefined) return EMPTY_RESULT;

  const pluginRoot = process.env[ENV_PLUGIN_ROOT];
  if (!pluginRoot) return EMPTY_RESULT;

  let lines: string[];
  try {
    lines = renderStatusLines(
      getRuleDocsStatus(input.cwd, pluginRoot),
      intervention,
      { compact: true },
    );
  } catch {
    return EMPTY_RESULT;
  }

  if (lines.length === 0) return EMPTY_RESULT;

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: HookEvent.SUBAGENT_START,
      additionalContext: lines.join('\n'),
    },
  };
}

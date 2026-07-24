import { ENV_PLUGIN_ROOT } from '../../constants/env.js';
import { HookEvent } from '../../constants/hooks.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { getRuleDocsStatus } from '../../core/ruleDocs/status/getRuleDocsStatus.js';
import type { HookOutput, SubagentStartInput } from '../../types/hooks.js';
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
  const pluginRoot = process.env[ENV_PLUGIN_ROOT];
  if (!pluginRoot || !input.cwd) return { continue: true };

  let lines: string[];
  try {
    lines = renderStatusLines(
      getRuleDocsStatus(input.cwd, pluginRoot),
      loadIntervention(input.cwd),
      { compact: true },
    );
  } catch {
    return { continue: true };
  }

  if (lines.length === 0) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: HookEvent.SUBAGENT_START,
      additionalContext: lines.join('\n'),
    },
  };
}

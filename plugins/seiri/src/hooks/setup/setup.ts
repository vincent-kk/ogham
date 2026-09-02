import { ENV_PLUGIN_ROOT } from '../../constants/env.js';
import { HookEvent } from '../../constants/hooks.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { getRuleDocsStatus } from '../../core/ruleDocs/status/getRuleDocsStatus.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';
import { renderStatusLines } from '../shared/renderStatusLines.js';

/**
 * SessionStart: report which seiri rules are active, where the dial sits,
 * and whether any deployed document drifted from its template.
 *
 * Reads only. Rule files are written exclusively by the setup surfaces,
 * so that every change to a project's `.claude/rules/` is the result of
 * an explicit user action rather than a side effect of opening a session.
 *
 * A project with no seiri rules deployed still hears the election contract
 * from standard upward. Off skips before rule status is read; advisory
 * reports deployed rule status when present but adds no workflow posture.
 */
export function processSessionStart(input: SessionStartInput): HookOutput {
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
    );
  } catch {
    // A malformed or unhashed manifest is a build defect on our side.
    // Reporting nothing is the honest outcome; taking the session down
    // over it is not.
    return EMPTY_RESULT;
  }

  if (lines.length === 0) return EMPTY_RESULT;

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: HookEvent.SESSION_START,
      additionalContext: lines.join('\n'),
    },
  };
}

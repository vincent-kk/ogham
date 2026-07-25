import { ENV_PLUGIN_ROOT } from '../../constants/env.js';
import { HookEvent } from '../../constants/hooks.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { getRuleDocsStatus } from '../../core/ruleDocs/status/getRuleDocsStatus.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import { renderStatusLines } from '../shared/renderStatusLines.js';

/**
 * SessionStart: report which seiri rules are active, where the dial sits,
 * and whether any deployed document drifted from its template.
 *
 * Reads only. Rule files are written exclusively by the setup surfaces,
 * so that every change to a project's `.claude/rules/` is the result of
 * an explicit user action rather than a side effect of opening a session.
 *
 * A project with no seiri rules deployed still hears the election
 * contract and nothing else: which workflow owns a moment does not depend
 * on a deployed file. The dial is what buys silence — at advisory the
 * render is empty whatever is deployed.
 */
export function processSessionStart(input: SessionStartInput): HookOutput {
  const pluginRoot = process.env[ENV_PLUGIN_ROOT];
  if (!pluginRoot || !input.cwd) return { continue: true };

  let lines: string[];
  try {
    lines = renderStatusLines(
      getRuleDocsStatus(input.cwd, pluginRoot),
      loadIntervention(input.cwd),
    );
  } catch {
    // A malformed or unhashed manifest is a build defect on our side.
    // Reporting nothing is the honest outcome; taking the session down
    // over it is not.
    return { continue: true };
  }

  if (lines.length === 0) return { continue: true };

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: HookEvent.SESSION_START,
      additionalContext: lines.join('\n'),
    },
  };
}

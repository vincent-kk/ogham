import { loadConfig } from '../../core/infra/configLoader/loaders/loadConfig.js';
import { getRuleDocsStatus } from '../../core/ruleDocs/status/getRuleDocsStatus.js';
import { DEFAULT_INTERVENTION } from '../../constants/intervention.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';

import { renderStatusLines } from './utils/renderStatusLines.js';

/**
 * SessionStart: report which seiri rules are active, where the dial sits,
 * and whether any deployed document drifted from its template.
 *
 * Reads only. Rule files are written exclusively by the setup surfaces,
 * so that every change to a project's `.claude/rules/` is the result of
 * an explicit user action rather than a side effect of opening a session.
 *
 * A project with no seiri rules deployed gets no injection at all — the
 * plugin costs nothing until someone opts in.
 */
export function processSessionStart(input: SessionStartInput): HookOutput {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot || !input.cwd) return { continue: true };

  let lines: string[];
  try {
    const { config, warning } = loadConfig(input.cwd);
    lines = renderStatusLines(
      getRuleDocsStatus(input.cwd, pluginRoot),
      config?.intervention ?? DEFAULT_INTERVENTION,
      warning,
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
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  };
}

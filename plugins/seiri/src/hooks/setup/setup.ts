import { INTERVENTION } from '../../constants/intervention.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { renderElectionLine } from '../../core/infra/configLoader/utils/renderElectionLine.js';
import { renderPostureLines } from '../../core/infra/configLoader/utils/renderPostureLines.js';
import { buildRuleDocsStatus } from '../../core/ruleDocs/status/buildRuleDocsStatus.js';
import { resolveSeiriProjectRuleTarget } from '../../core/ruleDocs/utils/resolveSeiriProjectRuleTarget.js';
import { readActorBinding } from '../../core/sessionSignals/workflow/readActorBinding.js';
import { suspendActor } from '../../core/sessionSignals/workflow/suspendActor.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import type { RuleDocStatus } from '../../types/manifest.js';
import type {
  WorkflowBinding,
  WorkflowHostAdapter,
} from '../../types/workflow.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';
import { WORKFLOW_ADAPTER } from '../shared/workflowAdapter.js';
import { workflowIdentity } from '../shared/workflowHost/workflowIdentity.js';

import { renderSessionStart } from './render/renderSessionStart.js';

/** Native session resets that suspend an existing binding; `compact` is intentionally absent. */
const NATIVE_BOUNDARY_SOURCES = ['startup', 'resume', 'clear', 'fork'];

/**
 * Suspend existing participation at native session resets; compaction is
 * continuous, so this actor's own active binding, when one exists, is read
 * back in and appended to the render instead. In standard/strict, report
 * which rules are active, where the dial sits, and the fixed election and
 * chain (and, at strict, posture) lines — regardless of whether rule
 * status can be read.
 * @param now Epoch ms read once at the calling hook's outermost handler.
 */
export function processSessionStart(
  input: SessionStartInput,
  adapter: WorkflowHostAdapter = WORKFLOW_ADAPTER,
  now: number = Date.now(),
): HookOutput {
  const identity = workflowIdentity(input, adapter);
  let binding: WorkflowBinding | undefined;
  if (NATIVE_BOUNDARY_SOURCES.includes(input.source ?? '')) {
    if (identity) suspendActor(identity, now);
  } else if (input.source === 'compact' && identity)
    binding = readActorBinding(identity, now);

  if (!input.cwd) return EMPTY_RESULT;
  const dial = loadHookIntervention(input.cwd);
  if (
    !dial ||
    dial.effective === INTERVENTION.OFF ||
    dial.effective === INTERVENTION.ADVISORY
  )
    return EMPTY_RESULT;

  const election = renderElectionLine(dial.effective);
  if (!election) return EMPTY_RESULT;
  const [chain, posture] = renderPostureLines(dial.effective);
  if (!chain) return EMPTY_RESULT;

  const lines = renderSessionStart({
    dial,
    ruleStatuses: readRuleStatuses(input.cwd),
    election,
    chain,
    posture,
    binding,
  });

  if (lines.length === 0) return EMPTY_RESULT;
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: lines.join('\n'),
    },
  };
}

/**
 * `undefined` when the plugin root or manifest cannot be read; the render
 * still emits election and chain.
 *
 * Every host's hook process receives `CLAUDE_PLUGIN_ROOT` (Claude
 * natively, Codex by injection, agy via its runner); `hostPaths` is
 * MCP-only.
 */
function readRuleStatuses(cwd: string): RuleDocStatus[] | undefined {
  try {
    const plugin = process.env.CLAUDE_PLUGIN_ROOT;
    return plugin
      ? buildRuleDocsStatus(plugin, () => resolveSeiriProjectRuleTarget(cwd))
      : undefined;
  } catch {
    return undefined;
  }
}

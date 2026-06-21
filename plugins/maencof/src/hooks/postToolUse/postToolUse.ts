import { runLifecycleDispatcher } from '../utils/lifecycleDispatcher/lifecycleDispatcher.js';
import { MAENCOF_MCP_TOOLS } from '../shared/maencofMcpTools.js';
import type {
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from '../../types/dispatch.js';
import { mergeHookOutput } from '../utils/mergeHookOutput/mergeHookOutput.js';
import { safeConcern } from '../utils/safeConcern/safeConcern.js';

import { runActivityRecorder } from './helpers/activityRecorder/activityRecorder.js';

/**
 * PostToolUse: the consolidated matcher is `*`, so the narrow MCP-write
 * allowlist that the old matcher provided is reapplied here before recording —
 * activityRecorder must not start logging read/kg_search/etc.
 */
export function orchestratePostToolUse(input: DispatchInput): MergedHookOutput {
  const results: HookConcernResult[] = [];

  if (input.tool_name && MAENCOF_MCP_TOOLS.has(input.tool_name)) {
    results.push(
      safeConcern(input.cwd, 'activity-recorder', () =>
        runActivityRecorder(input),
      ),
    );
  }
  results.push(
    safeConcern(input.cwd, 'lifecycle-dispatcher', () =>
      runLifecycleDispatcher('PostToolUse', input),
    ),
  );
  return mergeHookOutput('PostToolUse', results);
}

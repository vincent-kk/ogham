#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';
import { selfProbe } from '@ogham/cross-platform/self-probe';

import { readStdin, writeResult } from '../../shared/index.js';
import { orchestrateSessionStart } from '../orchestrators/sessionStart.js';
import type { DispatchInput, MergedHookOutput } from '../utils/types.js';

// SessionStart first hook entry — diagnose node/git/PATH/CLAUDE_PLUGIN_ROOT.
// Errors are appended to ~/.claude/plugins/maencof/error-log.json so silent
// hook failures (e.g. Windows PATH lacks node) become observable.
const probe = await selfProbe({ writeLog: true, pkg: 'maencof' });

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = orchestrateSessionStart(input);
} catch (e) {
  logHookFailure('maencof', 'session-start', e);
  result = { continue: true };
}

// Surface diagnostic failures to the user via additionalContext so they are
// not silent. selfProbe already wrote a structured error-log entry above.
if (probe.errors.length > 0) {
  const warning =
    '[maencof] hook bootstrap diagnostic — some hooks may not work:\n' +
    probe.errors.map((e) => `  - ${e}`).join('\n') +
    '\nSee ~/.claude/plugins/maencof/error-log.json for details.';
  const existing = result.hookSpecificOutput?.additionalContext;
  result.hookSpecificOutput = {
    hookEventName: 'SessionStart',
    additionalContext: existing ? `${existing}\n\n${warning}` : warning,
  };
}

writeResult(result);

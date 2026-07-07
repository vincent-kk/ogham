#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';
import { selfProbe } from '@ogham/cross-platform/self-probe';

import type { DispatchInput, MergedHookOutput } from '../../types/dispatch.js';
import { readStdin } from '../shared/readStdin.js';
import { writeResult } from '../shared/writeResult.js';

import { buildProbeAdvisory } from './helpers/probeAdvisory/probeAdvisory.js';
import { orchestrateSessionStart } from './sessionStart.js';

// SessionStart first hook entry — diagnose node/git/PATH availability.
// Logging happens below on the FILTERED error set: probeAdvisory drops signals
// that also fire in healthy sessions (CLAUDE_PLUGIN_ROOT env absence), so the
// error log and the Claude-facing warning only carry actionable failures.
const probe = await selfProbe({ writeLog: false, pkg: 'maencof' });

const raw = await readStdin();
let result: MergedHookOutput;
try {
  const input = JSON.parse(raw) as DispatchInput;
  result = orchestrateSessionStart(input);
} catch (e) {
  logHookFailure('maencof', 'session-start', e);
  result = { continue: true };
}

const { actionable, advisory } = buildProbeAdvisory(probe.errors);
if (advisory) {
  logHookFailure('maencof', 'self-probe', { errors: actionable });
  const existing = result.hookSpecificOutput?.additionalContext;
  result.hookSpecificOutput = {
    hookEventName: 'SessionStart',
    additionalContext: existing ? `${existing}\n\n${advisory}` : advisory,
  };
}

writeResult(result);

#!/usr/bin/env node
import { errorLogPath, logHookFailure } from '@ogham/cross-platform/error-log';
import { selfProbe } from '@ogham/cross-platform/self-probe';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';

import { processSetup } from './setup.js';

const log = createLogger('setup');

// SessionStart first hook entry — diagnose node/git/PATH/CLAUDE_PLUGIN_ROOT.
// Errors append to the host-aware plugin error log (`errorLogPath`) so silent
// hook failures (e.g. Windows PATH lacks node) become observable.
const probe = await selfProbe({ writeLog: true, pkg: 'filid' });

const raw = await readStdin(5000);
let result: HookOutput;
try {
  const input = JSON.parse(raw) as SessionStartInput;
  result = processSetup(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('filid', 'setup', e);
  result = { continue: true };
}

// Surface diagnostic failures to the user via additionalContext so they are
// not silent. selfProbe already wrote a structured error-log entry above.
if (probe.errors.length > 0) {
  const warning =
    '[filid] hook bootstrap diagnostic — some hooks may not work:\n' +
    probe.errors.map((e) => `  - ${e}`).join('\n') +
    `\nSee ${errorLogPath('filid')} for details.`;
  const existing = result.hookSpecificOutput?.additionalContext;
  result.hookSpecificOutput = {
    hookEventName: 'SessionStart',
    additionalContext: existing ? `${existing}\n\n${warning}` : warning,
  };
}

process.stdout.write(JSON.stringify(result));

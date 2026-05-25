#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { SubagentStartInput } from '../../types/hooks.js';

import { processAgentEnforcer } from './agent-enforcer.js';

const log = createLogger('agent-enforcer');
const raw = await readStdin(5000);
let result;
try {
  const input = JSON.parse(raw) as SubagentStartInput;
  result = processAgentEnforcer(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('imbas', 'agent-enforcer', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { SessionEndInput } from '../../types/hooks.js';

import { processSessionCleanup } from './sessionCleanup.js';

const log = createLogger('session-cleanup');
const raw = await readStdin(5000);
let result;
try {
  const input = JSON.parse(raw) as SessionEndInput;
  result = processSessionCleanup(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('imbas', 'session-cleanup', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

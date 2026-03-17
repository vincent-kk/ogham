#!/usr/bin/env node
import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { SessionEndInput } from '../../types/hooks.js';
import { cleanupSession } from '../session-cleanup.js';

const log = createLogger('session-cleanup');
const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as SessionEndInput;
  result = cleanupSession(input);
} catch (e) {
  log.error('hook entry failed', e);
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));

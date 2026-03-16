#!/usr/bin/env node
import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';
import { injectPlanChecklist } from '../plan-gate.js';

const log = createLogger('plan-gate');
const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = injectPlanChecklist(input);
} catch (e) {
  log.error('hook entry failed', e);
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));

#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { UserPromptSubmitInput } from '../../types/hooks.js';

import { processContextInjector } from './context-injector.js';

const log = createLogger('context-injector');
const raw = await readStdin(5000);
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = processContextInjector(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('imbas', 'context-injector', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';

import { processPreToolUse } from './pre-tool-use.js';

const log = createLogger('pre-tool-use');
const raw = await readStdin(5000);
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = processPreToolUse(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('imbas', 'pre-tool-use', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { UserPromptSubmitInput } from '../../types/hooks.js';

import { handleUserPromptSubmit } from './user-prompt-submit.js';

const log = createLogger('user-prompt-submit');
const raw = await readStdin(3000);
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = handleUserPromptSubmit(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('filid', 'user-prompt-submit', e);
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));

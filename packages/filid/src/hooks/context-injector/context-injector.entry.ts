#!/usr/bin/env node
import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { UserPromptSubmitInput } from '../../types/hooks.js';
import { handleUserPromptSubmit } from '../user-prompt-submit/user-prompt-submit.js';

const log = createLogger('context-injector');
const raw = await readStdin(3000);
let result;
try {
  const input = JSON.parse(raw) as UserPromptSubmitInput;
  result = handleUserPromptSubmit(input);
} catch (e) {
  log.error('hook entry failed', e);
  result = { continue: true };
}

process.stdout.write(JSON.stringify(result));

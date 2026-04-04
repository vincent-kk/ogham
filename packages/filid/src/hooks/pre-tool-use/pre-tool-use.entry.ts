#!/usr/bin/env node
import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';
import { handlePreToolUse } from './pre-tool-use.js';

const log = createLogger('pre-tool-use');
const raw = await readStdin(2000);
let result;
try {
  const input = JSON.parse(raw) as PreToolUseInput;
  result = await handlePreToolUse(input);
} catch (e) {
  log.error('hook entry failed', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

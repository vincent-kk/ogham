#!/usr/bin/env node
import { logHookFailure, normalizeCodexToolUses } from '@ogham/cross-platform';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';

import { handlePreToolUseBatch } from './preToolUse.js';

const log = createLogger('pre-tool-use');
const raw = await readStdin(2000);
let result;
try {
  // Loaded by the PreToolUse hook manifest; every logical patch operation is
  // normalized here before the product pipeline merges one physical decision.
  const normalized = normalizeCodexToolUses(JSON.parse(raw) as PreToolUseInput);
  result = await handlePreToolUseBatch(normalized);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('filid', 'pre-tool-use', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

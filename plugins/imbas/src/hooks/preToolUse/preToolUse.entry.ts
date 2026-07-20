#!/usr/bin/env node
import { normalizeCodexToolUse } from '@ogham/cross-platform/codex-hooks';
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { PreToolUseInput } from '../../types/hooks.js';

import { processPreToolUse } from './preToolUse.js';

const log = createLogger('pre-tool-use');
const raw = await readStdin(5000);
let result;
try {
  // Codex sends file edits as apply_patch; normalise to Write/Edit so the
  // .imbas/ path check below sees the target (no-op on Claude/agy).
  const input = normalizeCodexToolUse(JSON.parse(raw) as PreToolUseInput);
  result = processPreToolUse(input);
} catch (e) {
  log.error('hook entry failed', e);
  logHookFailure('imbas', 'pre-tool-use', e);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

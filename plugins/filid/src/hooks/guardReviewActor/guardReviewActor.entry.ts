#!/usr/bin/env node
// Loaded by hooks/hooks.json; agent_type selects review actor isolation.
import { logHookFailure } from '@ogham/cross-platform';

import { createLogger } from '../../lib/logger.js';
import { readStdin } from '../../lib/stdin.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';

import { guardReviewActor } from './guardReviewActor.js';

const log = createLogger('guard-review-actor');
const raw = await readStdin(2000);
let result: HookOutput;
try {
  result = guardReviewActor(JSON.parse(raw) as PreToolUseInput);
} catch (error) {
  log.error('hook entry failed', error);
  logHookFailure('filid', 'guard-review-actor', error);
  result = { continue: true };
}
process.stdout.write(JSON.stringify(result));

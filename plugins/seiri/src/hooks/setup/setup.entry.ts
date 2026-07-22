#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processSessionStart } from './setup.js';

let result: HookOutput = { continue: true };
try {
  const input = JSON.parse(await readStdin()) as SessionStartInput;
  result = processSessionStart(input);
} catch (error) {
  // Never block a session on our own failure — record it and fall through
  // to no injection, which is the same state as "seiri not set up here".
  logHookFailure('seiri', 'setup', error);
}

process.stdout.write(JSON.stringify(result));

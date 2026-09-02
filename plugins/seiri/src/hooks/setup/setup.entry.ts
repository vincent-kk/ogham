#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, SessionStartInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';
import { writeHookOutput } from '../shared/writeHookOutput.js';

import { processSessionStart } from './setup.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as SessionStartInput;
  result = processSessionStart(input);
} catch (error) {
  // Never block a session on our own failure — record it and fall through
  // to no injection, which is the same state as "seiri not set up here".
  logHookFailure(PLUGIN_NAME, HookName.SETUP, error);
}

writeHookOutput(result);

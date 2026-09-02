#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, InstructionsLoadedInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';
import { writeHookOutput } from '../shared/writeHookOutput.js';

import { processInstructionsLoaded } from './instructionsLoaded.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as InstructionsLoadedInput;
  result = processInstructionsLoaded(input);
} catch (error) {
  logHookFailure(PLUGIN_NAME, HookName.INSTRUCTIONS_LOADED, error);
}

writeHookOutput(result);

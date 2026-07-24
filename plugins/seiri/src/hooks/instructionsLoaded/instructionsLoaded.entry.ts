#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { InstructionsLoadedInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processInstructionsLoaded } from './instructionsLoaded.js';

try {
  const input = JSON.parse(await readStdin()) as InstructionsLoadedInput;
  processInstructionsLoaded(input);
} catch (error) {
  logHookFailure(PLUGIN_NAME, HookName.INSTRUCTIONS_LOADED, error);
}

process.stdout.write(JSON.stringify(EMPTY_RESULT));

#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import type { HookOutput, InstructionsLoadedInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processInstructionsLoaded } from './instructionsLoaded.js';

const result: HookOutput = { continue: true };
try {
  const input = JSON.parse(await readStdin()) as InstructionsLoadedInput;
  processInstructionsLoaded(input);
} catch (error) {
  logHookFailure('seiri', 'instructions-loaded', error);
}

process.stdout.write(JSON.stringify(result));

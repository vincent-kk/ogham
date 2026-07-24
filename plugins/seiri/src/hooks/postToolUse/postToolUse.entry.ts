#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processBashOutcome } from './postToolUse.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as
    | PostToolUseInput
    | PostToolUseFailureInput;
  result = processBashOutcome(input);
} catch (error) {
  // This runs after every shell command. Failing loudly here would turn
  // our own bug into noise on unrelated work, so it records and falls
  // through to no injection.
  logHookFailure(PLUGIN_NAME, HookName.POST_TOOL_USE, error);
}

process.stdout.write(JSON.stringify(result));

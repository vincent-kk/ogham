#!/usr/bin/env node
import { logHookFailure } from '@ogham/cross-platform/error-log';

import { HookName } from '../../constants/hooks.js';
import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';

import { processUserPromptSubmit } from './userPromptSubmit.js';

let result: HookOutput = EMPTY_RESULT;
try {
  const input = JSON.parse(await readStdin()) as UserPromptSubmitInput;
  result = processUserPromptSubmit(input);
} catch (error) {
  // This runs before every turn. Failing loudly here would turn our own bug
  // into noise on the user's prompt, so it records and falls through to no
  // injection.
  logHookFailure(PLUGIN_NAME, HookName.USER_PROMPT_SUBMIT, error);
}

process.stdout.write(JSON.stringify(result));

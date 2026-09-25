#!/usr/bin/env node
// Loaded by hooks/hooks.json; bridge/pre-tool-use.mjs selects this entry.
import { logHookFailure } from '@ogham/cross-platform';

import { EMPTY_RESULT, PLUGIN_NAME } from '../../constants/plugin.js';
import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';
import { readStdin } from '../shared/readStdin.js';
import { writeHookOutput } from '../shared/writeHookOutput.js';

import { processToolStart } from './preToolUse.js';

let result: HookOutput = EMPTY_RESULT;
try {
  result = processToolStart(JSON.parse(await readStdin()) as PreToolUseInput);
} catch (error) {
  logHookFailure(PLUGIN_NAME, 'pre-tool-use', error);
}
writeHookOutput(result);
